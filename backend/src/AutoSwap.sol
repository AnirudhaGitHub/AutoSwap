// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IERC20.sol";

// AutoSwap is a DEX aggregator built on canto DEX and cadence DEX on canto mainnet
interface IBaseV1Router {
    struct route {
        address from;
        address to;
        bool stable;
    }
    function getAmountOut(uint amountIn, address tokenIn, address tokenOut) external view returns (uint amount, bool stable);
    function getAmountsOut(uint amountIn, route[] memory routes) external view returns (uint[] memory amounts);
    function getAmountsIn(uint amountOut, route[] memory routes) external view returns (uint[] memory amounts);
    function swapExactTokensForTokensSimple(uint amountIn, uint amountOutMin, address tokenFrom, address tokenTo, bool stable, address to, uint deadline) external returns (uint[] memory amounts);
    function swapExactTokensForTokens(uint amountIn, uint amountOutMin, route[] calldata routes, address to, uint deadline) external returns (uint[] memory amounts);
    function swapExactCANTOForTokens(uint amountOutMin, route[] calldata routes, address to, uint deadline) external payable returns (uint[] memory amounts);
    function swapExactTokensForCANTO(uint amountIn, uint amountOutMin, route[] calldata routes, address to, uint deadline) external returns (uint[] memory amounts);
    function UNSAFE_swapExactTokensForTokens(uint[] memory amounts, route[] calldata routes, address to, uint deadline) external returns (uint[] memory);
    function setStable(address underlying) external returns (uint);
    // function getUnderlyingPrice(CToken ctoken) external view returns(uint);

}

interface ICadenceRouter{
    function swap(
        address[] memory _path,
        uint256 _amountIn,
        uint256 _minOut,
        address _receiver
    ) external;
}

interface IVault{}

interface ICadenceReader{
    function getAmountOut(IVault _vault, address _tokenIn, address _tokenOut, uint256 _amountIn) external view returns (uint256, uint256);
}

// AutoSwap is a DEX aggregator built on canto DEX and cadence DEX on canto mainnet
contract AutoSwap{
    IBaseV1Router public cantoRouter = IBaseV1Router(0xa252eEE9BDe830Ca4793F054B506587027825a8e);
    ICadenceRouter public cadenceRouter = ICadenceRouter(0xf9B8078f214b24CD64eD1d8959fF8480d6FC41ab);
    ICadenceReader public cadenceReader = ICadenceReader(0xBE95cA57877CC17439C7Ae3E63c4788BA80E1E39);
    address public cadenceVault = 0xbB975222F04C1992A39A27b19261646FD6547919;

    struct BestSwapParams {
        address tokenIn;
        address tokenOut;
        uint amountIn;
        IBaseV1Router.route[] cantoRoute;
    }

    function getBestSwap(address tokenIn, address tokenOut, uint amountIn, IBaseV1Router.route[] calldata cantoRoute)public view returns(uint, uint){
        // Get Canto DEX price
        // (uint cantoAmountOut, bool stable) = cantoRouter.getAmountOut(amountIn, tokenIn, tokenOut);
        uint[] memory cantoAmountsOut = cantoRouter.getAmountsOut(amountIn, cantoRoute);
        uint cantoAmountOut = cantoAmountsOut[cantoAmountsOut.length - 1]; // Last element is the output amount
         
        // get cadence price
        (uint amountOutAfterFees, ) = cadenceReader.getAmountOut(
            IVault(cadenceVault),
            tokenIn,
            tokenOut, 
            amountIn
        );

        return (cantoAmountOut, amountOutAfterFees);
    }

    function getBestSwapSplit(BestSwapParams memory params) public view returns(uint bestCantoPercentage, uint bestCadencePercentage, uint bestAmountOut) {
        uint bestCantoAmountOut = 0;
        uint bestCadenceAmountOut = 0;

        // Loop through percentages from 10% to 100%
        for (uint i = 0; i <= 100; i += 10) {
            uint splitAmountIn = params.amountIn * i / 100;

            // Calculate the swap amount for Canto
            uint[] memory cantoAmountsOut = cantoRouter.getAmountsOut(splitAmountIn, params.cantoRoute);

            // Calculate the swap amount for Cadence
            (uint cadenceAmountOut, ) = cadenceReader.getAmountOut(
                IVault(cadenceVault),
                params.tokenIn,
                params.tokenOut,
                params.amountIn - splitAmountIn
            );

            // Sum the amounts from both swaps
            uint totalAmountOut = cantoAmountsOut[cantoAmountsOut.length - 1] + cadenceAmountOut;

            // If the total amount out is better than the previous best, update the best amounts and percentages
            if (totalAmountOut > bestAmountOut) {
                bestAmountOut = totalAmountOut;
                bestCantoAmountOut = cantoAmountsOut[cantoAmountsOut.length - 1];
                bestCadenceAmountOut = cadenceAmountOut;
                bestCantoPercentage = i;
                bestCadencePercentage = 100 - i;
            }
        }

        // Return the best percentages and the best amount out
        return (bestCantoPercentage, bestCadencePercentage, bestAmountOut);
    }

    function swap(address tokenIn, address tokenOut, uint amountInCanto, uint amountInCadence, uint amountOutMin, IBaseV1Router.route[] calldata cantoRoute) external {
        uint balanceBefore = IERC20(tokenOut).balanceOf(address(this));

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountInCanto + amountInCadence);

        if(amountInCanto > 0) {
            IERC20(tokenIn).approve(address(cantoRouter), amountInCanto);

            uint[] memory amounts = cantoRouter.swapExactTokensForTokens(
                amountInCanto,
                0,
                cantoRoute,
                address(this), // to
                block.timestamp
            );
        }
        
        if(amountInCadence > 0) {
            IERC20(tokenIn).approve(address(cadenceRouter), amountInCadence);
            address[] memory path = new address[](2);
            path[0] = address(tokenIn);
            path[1] = address(tokenOut); 

            cadenceRouter.swap(
                path,
                amountInCadence,
                0,
                address(this)
            );
        }

        uint balanceAfter = IERC20(tokenOut).balanceOf(address(this));
        require(amountOutMin <= balanceAfter - balanceBefore, "slippage hit");
        
        IERC20(tokenIn).transfer(msg.sender, balanceAfter - balanceBefore);
    }


    function swapTokens(
        uint amountIn,
        uint amountOutMin,
        address tokenFrom,
        address tokenTo,
        bool stable,
        address to,
        uint deadline
    ) external {
        
        IERC20(tokenFrom).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenFrom).approve(address(cantoRouter), amountIn);
        // Call the swapExactTokensForTokensSimple function from the cantoRouter
        uint[] memory amounts = cantoRouter.swapExactTokensForTokensSimple(
            amountIn,
            amountOutMin,
            tokenFrom,
            tokenTo,
            stable,
            to,
            deadline
        );
    }

    function swapTokensWithCadenceRouter(
        address[] memory path,
        uint256 amountIn,
        uint256 minOut,
        address receiver
    ) external {
        // Transfer the tokens from the sender to this contract
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);

        // Approve the CadenceRouter to spend the tokens
        IERC20(path[0]).approve(address(cadenceRouter), amountIn);

        // Call the swap function from the CadenceRouter
        cadenceRouter.swap(
            path,
            amountIn,
            minOut,
            receiver
        );

        // Additional logic after the swap can be added here
    }
}



