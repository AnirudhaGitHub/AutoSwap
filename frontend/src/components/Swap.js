import React, { useState, useEffect } from "react";
import { Input, Popover, Radio, Modal, message } from "antd";
import {
  ArrowDownOutlined,
  DownOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import tokenList from "../tokenList.json";
import axios from "axios";
import { useSendTransaction, useWaitForTransaction, useSigner} from "wagmi";
import {swapTokens, approveToken, getAllowance, previewSwap} from "../contractFunctions/dex"
import { sepolia } from '@wagmi/core/chains';
import {ethers} from "ethers"
import canto from "../tokenLogos/canto.svg"
import cnote from "../tokenLogos/cnote.svg"
import note from "../tokenLogos/note.svg"
import usdc from "../tokenLogos/usdc.png"
import atom from "../tokenLogos/atom.svg"
import eth from "../tokenLogos/eth.svg"
import cadence from "../tokenLogos/cadence.png"


const tokenLogo = {
  WCANTO: canto,
  ETH: eth,
  ATOM: atom,
  cNOTE: cnote,
  USDC: usdc,
  NOTE: note
}

const dexAddress = "0xe626C5b2CC46C0B75dd7D26192b56615889712f5"
function Swap(props) {
  // const { data: signer } = useSigner({chainId: sepolia.id});
  const { address, isConnected } = props;
  const [messageApi, contextHolder] = message.useMessage();
  const [slippage, setSlippage] = useState(2.5);
  const [tokenOneAmount, setTokenOneAmount] = useState(null);
  const [tokenTwoAmount, setTokenTwoAmount] = useState(null);
  const [tokenOne, setTokenOne] = useState(tokenList[0]);
  const [tokenTwo, setTokenTwo] = useState(tokenList[1]);
  const [isOpen, setIsOpen] = useState(false);
  const [changeToken, setChangeToken] = useState(1);
  const [prices, setPrices] = useState(null);
  const [txDetails, setTxDetails] = useState({
    to:null,
    data: null,
    value: null,
  }); 
  const [allowance, setAllowance] = useState(false);
  const [swapLoading, setSwapLoading] = useState(null);
  const [approveLoading, setApproveLoading] = useState(null);
  const [isSwapSuccess, setIsSwapSuccess] = useState(null);
  const [isApproveSuccess, setIsApproveSuccess] = useState(null);
  const [cantoRoute, setCantoRoute] = useState([]);
  const [cantoSplitAmount, setCantoSpiltAmount] = useState(null);
  const [cadenceSplitAmount, setCadenceSpiltAmount] = useState(null);
  const [cantoPercent, setCantoPercent] = useState(null);
  const [cadencePercent, setCadencePercent] = useState(null);
  
async function callSwap(){
    try {
      // tokenIn, tokenOut, amountInCanto, amountInCadence, amountOutMin, cantoRoute
      setSwapLoading(true); // Set loading state to true before calling the swap function
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      const signer = provider.getSigner();
      let amountOutMin = (( 100 - parseFloat(slippage.toString()) ) / 100) * parseFloat(tokenTwoAmount.toString())
      amountOutMin = ethers.utils.parseUnits(amountOutMin.toFixed(tokenTwo.decimals).toString(), tokenTwo.decimals).toString()
      console.log("swap ", tokenOne.address, tokenTwo.address, cantoSplitAmount, cadenceSplitAmount, 0, cantoRoute, amountOutMin)
      const res = await swapTokens(signer, tokenOne.address, tokenTwo.address, cantoSplitAmount, cadenceSplitAmount, amountOutMin, cantoRoute);
      setIsSwapSuccess(res)
    } catch (error) {
      console.error("Swap failed", error);
      // Handle swap error here
    } finally {
      setSwapLoading(false); // Set loading state to false after the swap function is complete
    }
  }
async function approve(){
    try {
      
      setApproveLoading(true); // Set loading state to true before calling the approve function
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      const signer = provider.getSigner();
      const res = await approveToken(tokenOne.address, dexAddress, ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals), signer);
      setIsApproveSuccess(res)
    } catch (error) {
      console.error("Approval failed", error);
      // Handle approval error here
    } finally {
      setApproveLoading(false); // Set loading state to false after the approve function is complete
    }
  }

  function handleSlippageChange(e) {
    setSlippage(e.target.value);
  }

  function changeAmount(e) {
    setTokenOneAmount(e.target.value);
    // if(e.target.value && prices){
    //   setTokenTwoAmount((e.target.value * prices.ratio).toFixed(18))
    // }else{
    //   setTokenTwoAmount(null);
    // }
  }

  function switchTokens() {
    setPrices(null);
    setTokenOneAmount(null);
    setTokenTwoAmount(null);
    const one = tokenOne;
    const two = tokenTwo;
    setTokenOne(two);
    setTokenTwo(one);
  }

  function openModal(asset) {
    setChangeToken(asset);
    setIsOpen(true);
  }

  function modifyToken(i){
    setPrices(null);
    setTokenOneAmount(null);
    setTokenTwoAmount(null);
    if (changeToken === 1) {
      setTokenOne(tokenList[i]);
    } else {
      setTokenTwo(tokenList[i]);
    }
    setIsOpen(false);
  }

  useEffect(() => {
    const interval = setInterval(() => {
      async function getAllowanceVal() {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const val = await getAllowance(tokenOne.address, address, dexAddress, provider);
        let bool = false;
        const amount = ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals)
        if (val.gte(amount)) bool = true;
        console.log("bool", bool, val.toString(), amount.toString());
        setAllowance(bool);
      }
      // if (address) {
        getAllowanceVal();
      // }
    }, 5000); // interval set to 5 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [address, tokenOne.address, tokenOneAmount]);

  //preview swap
  useEffect(() => {
    async function preview() {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      if(tokenOneAmount == "" || tokenOne.address.toLowerCase() == tokenTwo.address.toLowerCase() ){
        setTokenTwoAmount(null);
        return
      }
      
      const amountIn = ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals)
      const val = await previewSwap(provider, tokenOne.address, tokenTwo.address, amountIn, tokenOne.ticker, tokenTwo.ticker);
      if(val.status){
        const amountOut = ethers.utils.formatUnits(val.data[2], tokenTwo.decimals)
        const cantoPercent = parseFloat(val.data[0].toString())
        const candencePercent = parseFloat(val.data[1].toString())
        const amountInCanto = cantoPercent <= 0 ? 0 : parseFloat(tokenOneAmount) * (cantoPercent / 100)
        const amountInCadence = candencePercent <= 0 ? 0 : parseFloat(tokenOneAmount) * (candencePercent / 100)
        const amountInCantoBN = cantoPercent <= 0 ? "0" : ethers.utils.parseUnits(amountInCanto.toString(), tokenOne.decimals).toString()
        const amountInCadenceBn = candencePercent <= 0 ? "0" :ethers.utils.parseUnits(amountInCadence.toString(), tokenOne.decimals).toString()
        
        console.log("amountOut from preview : ", amountOut, val, amountInCantoBN, amountInCadenceBn)
        setTokenTwoAmount(amountOut);
        setCantoRoute(val.cantoRoute)
        setCantoSpiltAmount(amountInCantoBN)
        setCadenceSpiltAmount(amountInCadenceBn) 
        setCantoPercent(cantoPercent)
        setCadencePercent(candencePercent)
        
      }
    }

    preview();
  }, [address, tokenOne. tokenTwo, tokenOneAmount]);

  useEffect(()=>{

    messageApi.destroy();

    if(swapLoading){
      messageApi.open({
        type: 'loading',
        content: 'Swapping...',
        duration: 0,
      })
    }    

  },[swapLoading])

  useEffect(()=>{

    messageApi.destroy();

    if(approveLoading){
      messageApi.open({
        type: 'loading',
        content: 'Approving...',
        duration: 0,
      })
    }    

  },[approveLoading])

  useEffect(()=>{
    messageApi.destroy();
    if(isSwapSuccess){
      messageApi.open({
        type: 'success',
        content: 'Transaction Successful',
        duration: 1.5,
      })
    }else if(isSwapSuccess == false){
      messageApi.open({
        type: 'error',
        content: 'Transaction Failed',
        duration: 1.50,
      })
    }


  },[isSwapSuccess])

  useEffect(()=>{
    messageApi.destroy();
    if(isApproveSuccess){
      messageApi.open({
        type: 'success',
        content: 'Transaction Successful',
        duration: 1.5,
      })
    }else if(!isApproveSuccess == false){
      messageApi.open({
        type: 'error',
        content: 'Transaction Failed',
        duration: 1.50,
      })
    }


  },[isApproveSuccess])

  const settings = (
    <>
      <div>Slippage Tolerance</div>
      <div>
        <Radio.Group value={slippage} onChange={handleSlippageChange}>
          <Radio.Button value={0.5}>0.5%</Radio.Button>
          <Radio.Button value={2.5}>2.5%</Radio.Button>
          <Radio.Button value={5}>5.0%</Radio.Button>
        </Radio.Group>
      </div>
    </>
  );

  return (
    <>
      {contextHolder}
      <div style={{ display: "flex", flexDirection: "column", marginBottom: "30px" }}>
      <div style={{  marginBottom: "20px", display: "flex", alignItems: "center", flexDirection: "column" }}>
        <h2 style={{ marginBottom: "0px" }}>DEX Aggregator</h2>
        <p style={{ display: "flex", alignItems: "center" }}>
          Built on
          <img src={canto} alt="Canto" className="tokenLogo" style={{ marginLeft: "5px" }} /> Canto & 
          <img src={cadence} alt="Cadence" width="110px" style={{ marginLeft: "5px" }}/>
        </p>
      </div>
      <Modal
        open={isOpen}
        footer={null}
        onCancel={() => setIsOpen(false)}
        title="Select a token"
      >
        <div className="modalContent">
          {tokenList?.map((e, i) => {
            return (
              <div
                className="tokenChoice"
                key={i}
                onClick={() => modifyToken(i)}
              >
                <img src={tokenLogo[e.ticker]} alt={e.ticker} className="tokenLogo" />
                <div className="tokenChoiceNames">
                  <div className="tokenName">{e.name}</div>
                  <div className="tokenTicker">{e.ticker}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
      <div className="tradeBox">
        <div className="tradeBoxHeader">
          <h4>Swap</h4>
          <Popover
            content={settings}
            title="Settings"
            trigger="click"
            placement="bottomRight"
          >
            <SettingOutlined className="cog" />
          </Popover>
        </div>
        <div className="inputs">
          <Input
            placeholder="0"
            value={tokenOneAmount}
            onChange={changeAmount}
          />
          <Input placeholder="0" value={tokenTwoAmount} disabled={true} />
          <div className="switchButton" onClick={switchTokens}>
            <ArrowDownOutlined className="switchArrow" />
          </div>
          <div className="assetOne" onClick={() => openModal(1)}>
            <img src={tokenLogo[tokenOne.ticker]} alt="assetOneLogo" className="assetLogo" />
            {tokenOne.ticker}
            <DownOutlined />
          </div>
          <div className="assetTwo" onClick={() => openModal(2)}>
            <img src={tokenLogo[tokenTwo.ticker]} alt="assetOneLogo" className="assetLogo" />
            {tokenTwo.ticker}
            <DownOutlined />
          </div>
        </div>
        {/* <div style={{ marginTop: "10px" }}> */}
          <br />
          <span style={{ marginBottom:"5px" }}>DEX split for best Returns :</span>
          <span style={{ color: "#999" }}>Canto Percentage: {cantoPercent ? cantoPercent.toString() + " %" : " - "}</span>
          <span style={{ color: "#999" }}>Cadence Percentage: {cadencePercent ? cadencePercent.toString() + " %" : " - "}</span>
        {/* </div> */}

        <div 
          className="swapButton" 
          disabled={!tokenOneAmount || !isConnected || tokenOne.address.toLowerCase() == tokenTwo.address.toLowerCase()} 
          onClick={allowance ? callSwap : approve}>
            {allowance ? "Swap" : ( tokenOne.address.toLowerCase() == tokenTwo.address.toLowerCase() ? "Select different tokens" : "Approve")}
        </div>
      </div>
      </div>
    </>
  );
}

export default Swap;
