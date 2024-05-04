const {ethers} = require("ethers")
const dex = require("../constants/abis/dex.json")
const IERC20 = require("../constants/abis/IERC20.json")
const tokenList = require("../tokenList.json")
const dexAddress = '0x59b670e9fA9D0A427751Af201D676719a970857b'; //0x59b670e9fA9D0A427751Af201D676719a970857b
// 0x0E692f65a56635e89D000CE6a760653f7497F021
export async function swapTokens(tokenIn, tokenOut, amountInCanto, amountInCadence, amountOutMin, cantoRoute) {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      // Create a new instance of the contract
      const contract = new ethers.Contract(dexAddress, dex, signer);
      
      const tx = await contract.swap(tokenIn, tokenOut, amountInCanto, amountInCadence, amountOutMin, cantoRoute, {gasLimit: "10000000"});
      console.log('Transaction hash:', tx.hash);
  
      // Wait for the transaction to be confirmed
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      return true
    } catch (error) {
      console.error('Error swapping tokens:', error);
      return false
    }
}

export async function previewSwap(provider, tokenIn, tokenOut, amountIn, tokenInSym, tokenOutSym) {
  try {
    const cantoRoute = getPath( tokenInSym, tokenOutSym)
    const params = {
      tokenIn: tokenIn, // Address of the token to swap from
      tokenOut: tokenOut, // Address of the token to swap to
      amountIn: amountIn, // Amount to swap 
      cantoRoute: cantoRoute
    };

    // Create a new instance of the contract
    const contract = new ethers.Contract(dexAddress, dex, provider);
    const preview = await contract.getBestSwapSplit(params)
    console.log("preview ", amountIn.toString(), preview.toString())
    return {status: true, data: preview, cantoRoute: cantoRoute}
  } catch (error) {
    console.error('Error in preview swap:', error);
    return {status: false, data: null}
  }
}

export async function getAllowance(tokenAddress, ownerAddress, spenderAddress, provider) {

  const tokenContract = new ethers.Contract(tokenAddress, IERC20, provider);

  // Call the allowance function
  try {
    const allowance = await tokenContract.allowance(ownerAddress, spenderAddress);
    console.log(`Allowance: ${allowance.toString()}`);
    return allowance;
  } catch (error) {
    console.error('Error getting allowance:', error);
  }
}

export async function approveToken(tokenAddress, spenderAddress, amount, signer) {
  const tokenContract = new ethers.Contract(tokenAddress, IERC20, signer);

  // Call the approve function
  try {
    const tx = await tokenContract.approve(spenderAddress, amount);
    console.log('Approval transaction:', tx);
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log('Transaction receipt:', receipt);
    
    return true;
  } catch (error) {
    console.error('Error approving tokens:', error);
    return false
  }
}

const tokenPairs = [
  { tokenIn: "cNOTE", tokenOut: "USDC" },
  { tokenIn: "NOTE", tokenOut: "USDC" },
  { tokenIn: "CANTO", tokenOut: "ATOM" },
  { tokenIn: "CANTO", tokenOut: "ETH" },
  { tokenIn: "CANTO", tokenOut: "NOTE" },
  { tokenIn: "NOTE", tokenOut: "USDC" },
  { tokenIn: "NOTE", tokenOut: "USDT" }
];

function getRoute(tokenIn, tokenOut) {
  // Check if there exists a direct pool for the given token pair
  const directPool = tokenPairs.find(pair => (pair.tokenIn === tokenIn && pair.tokenOut === tokenOut) || (pair.tokenIn === tokenOut && pair.tokenOut === tokenIn));
  if (directPool) {
      return [{ tokenIn, tokenOut }];
  }

  // Check for intermediate tokens that can bridge the swap
  const intermediateTokens = tokenPairs.filter(pair => pair.tokenIn === tokenIn || pair.tokenOut === tokenOut);

  // Generate all possible routes using intermediate tokens
  const routes = [];
  intermediateTokens.forEach(intermediateToken => {
      if (intermediateToken.tokenOut === tokenOut) {
          const route1 = [{ tokenIn, tokenOut: intermediateToken.tokenIn }, { tokenIn: intermediateToken.tokenOut, tokenOut }];
          const route2 = [{ tokenIn, tokenOut: intermediateToken.tokenOut }, { tokenIn: intermediateToken.tokenIn, tokenOut: tokenOut }];
          routes.push(route1, route2);
      } else {
          const route = [{ tokenIn, tokenOut: intermediateToken.tokenOut }, { tokenIn: intermediateToken.tokenIn, tokenOut }];
          routes.push(route);
      }
  });

  // Filter routes to ensure that the last tokenOut of one route matches the tokenIn of the next route
  const filteredRoutes = routes.filter((route, index) => {
      if (index < routes.length - 1) {
          return route[1].tokenOut === routes[index + 1][0].tokenIn;
      }
      return true;
  });

  // Return the first matching route, or an empty array if no route matches the criteria
  return filteredRoutes.length > 0 ? filteredRoutes[0] : [];
}

module.exports = {
  swapTokens,
  getAllowance,
  approveToken,
  previewSwap
}

// icon
// cNOTE / USDC
// icon
// NOTE / USDC
// icon
// CANTO / ATOM
// icon
// CANTO / ETH
// icon
// CANTO / NOTE
// icon
// NOTE / USDC
// icon
// NOTE / USDT

const path = {
  "WCANTO-cNOTE" : ["WCANTO", "NOTE", "USDC", "cNOTE"],
  "WCANTO-USDC": ["WCANTO", "NOTE", "USDC"],
  "ETH-ATOM": ["ETH", "WCANTO", "ATOM"],
  "ETH-cNOTE": ["ETH", "WCANTO", "NOTE", "USDC", "cNOTE"],
  "ETH-USDC": ["ETH", "WCANTO", "NOTE", "USDC"],
  "ETH-NOTE": ["ETH", "WCANTO", "NOTE"],
  "ATOM-cNOTE": ["ATOM", "WCANTO", "NOTE", "USDC", "cNOTE"],
  "ATOM-USDC": ["ATOM", "WCANTO", "NOTE", "USDC"],
  "ATOM-NOTE": ["ATOM", "WCANTO", "NOTE"],
  "cNOTE-NOTE": ["cNOTE", "USDC", "NOTE"]
}

function getPath(tokenIn, tokenOut){
  const key = tokenIn + "-" + tokenOut
  const rKey = tokenOut + "-" + tokenIn
  let list = []
  if(path[key]) list = path[key]
  else if(path[rKey]) list = path[rKey].reverse()
  else list = [tokenIn, tokenOut]

  let route = []
  for(let i = 0 ; i< list.length -1 ; i++){
    const tokenInAddress = getAddressByTicker(list[i])
    const tokenOutAddress = getAddressByTicker(list[i+1])
    const isStable = (list[i] == "USDC" && list[i+1] == "NOTE") || (list[i] == "NOTE" && list[i+1] == "USDC")
    route.push({
      from: tokenInAddress,
      to: tokenOutAddress,
      stable: isStable
    })
  }

  return route
}

function getAddressByTicker(ticker) {

  // Find the token with the given ticker
  const token = tokenList.find(token => token.ticker == ticker);
  
  // If token is found, return its address
  if (token) {
      return token.address;
  } else {
      return "0x0000000000000000000000000000000000000000";
  }
}