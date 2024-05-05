# AutoSwap - DEX aggregator on Canto Mainnet
<img width="710" alt="image" src="https://github.com/AnirudhaGitHub/AutoSwap/assets/167628180/f07a92fe-72df-4504-b0d5-1c45b1021722">

The AutoSwap contract serves as a decentralized exchange (DEX) aggregator, built on two underlying DEX platforms: Canto DEX and Cadence DEX. Its purpose is to provide users with a unified interface to interact with multiple DEXs and find the best route or split for achieving the optimal trade price.

## DEX Aggregator built on
| Sr. No. | DEX            |
|---------|----------------|
| 1       | Canto DEX      |
| 2       | Cadence DEX    |

## how it works:
1. DEX Aggregator Structure: The contract interfaces with two main DEX platforms, Canto DEX and Cadence DEX, through their respective router contracts (IBaseV1Router and ICadenceRouter).
```solidity
function getBestSwapSplit(BestSwapParams memory params) public view returns(uint bestCantoPercentage, uint bestCadencePercentage, uint bestAmountOut);
```
2. Best Route Calculation: The getBestSwapSplit function calculates the optimal trade route by considering various percentage splits between the two DEX platforms. It iterates over different percentage splits from 10% to 100%, evaluating the resulting trade amounts from each DEX platform. The combination of percentages that yields the highest total output amount is considered the best route.
3. Trade Execution: The swap function is responsible for executing the trade based on the calculated optimal route. It takes as input the input and output tokens, along with the desired input amounts for both Canto and Cadence DEXs. It then performs the swaps accordingly, dividing the input amount between the two DEXs based on the previously calculated optimal split. The function ensures that the resulting output amount meets the specified minimum output requirement to prevent slippage.
Overall, the AutoSwap contract abstracts away the complexities of interacting with multiple DEX platforms, providing users with a seamless experience while ensuring they get the best possible trade execution by leveraging the capabilities of both Canto and Cadence DEXs.
