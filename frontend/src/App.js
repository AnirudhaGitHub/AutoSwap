import "./App.css";
import Header from "./components/Header";
import Swap from "./components/Swap";
import Tokens from "./components/Tokens";
import { Routes, Route } from "react-router-dom";
import { useConnect, useAccount, useNetwork, useSwitchNetwork } from "wagmi";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { sepolia } from '@wagmi/core/chains';

function App() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect({
    connector: new MetaMaskConnector({chainId: 7700}),
    chainId: 7700
  });
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  console.log("chain", chain)
  return (

    <div className="App">
      <Header connect={connect} switchNetwork={switchNetwork} isConnected={isConnected} address={address} chain={chain} />
      <div className="mainWindow">
        <Routes>
          <Route path="/" element={<Swap isConnected={isConnected} address={address} />} />
        </Routes>
      </div>

    </div>
  )
}

export default App;
