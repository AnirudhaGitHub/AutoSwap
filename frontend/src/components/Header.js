import React from "react";
import canto from "../tokenLogos/canto.svg";
import { Link } from "react-router-dom";

function Header(props) {

  const {address, isConnected, connect, chain, switchNetwork} = props;

  return (
    <header>
      <div className="leftH">
        {/* <img src={Logo} alt="logo" className="logo" /> */}
        <h2>AutoSwap</h2>
        {/* <Link to="/" className="link">
          <div className="headerItem">Swap</div>
        </Link> */}
      </div>
      <div className="rightH">
        <div className="headerItem">
          <img src={canto} alt="Canto" className="eth" />
           Canto Mainnet
        </div>
        <div className="connectButton" onClick={connect}>
          {
            isConnected ? 
              (
                chain.id != 7700 ? 
                  "Switch Chain"
                  :
                  address.slice(0,4) +"..." +address.slice(38)
              )
            : "Connect Metamask"
          }
        </div>
      </div>
    </header>
  );
}

export default Header;
