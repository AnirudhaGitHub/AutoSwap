// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/AutoSwap.sol";
import "../src/IERC20.sol";


contract TokenSwapperTest is Test {
    AutoSwap swapper;
    address whale = 0xDb29eC3Fb265A03943bfEdBDF4eE9D9867B368e8;

    // Set up the test environment
    function setUp() public {
        // Deploy the AutoSwap contract
        swapper = new AutoSwap();
        // Additional setup can be done here
    }

    function testGetBestSwap() public {
        
        address tokenFrom = address(0x5FD55A1B9FC24967C4dB09C513C3BA0DFa7FF687); // Replace with actual token address
        address tokenTo = address(0x826551890Dc65655a0Aceca109aB11AbDbD7a07B);
        uint amountIn = 100e18;
        
        IBaseV1Router.route[] memory cantoRoute = new IBaseV1Router.route[](1);
        cantoRoute[0] = IBaseV1Router.route({
            from: tokenFrom,
            to: tokenTo,
            stable: false
        });

        AutoSwap.BestSwapParams memory params = AutoSwap.BestSwapParams(tokenFrom, tokenTo, amountIn, cantoRoute);
        (
            uint bestCantoPercentage,
            uint bestCadencePercentage,
            uint bestAmountOut 
        ) = swapper.getBestSwapSplit(params);

        deal(tokenFrom, address(this), amountIn);
        IERC20(tokenFrom).approve(address(swapper), amountIn);
        swapper.swap(tokenFrom, tokenTo, 0, amountIn, 0, cantoRoute);

        console.log("getBestSwapSplit ", 
            bestCantoPercentage,
            bestCadencePercentage,
            bestAmountOut
        );
    }
}


