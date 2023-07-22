import { useState, useEffect, useContext } from "react";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import './SteamGuard.css'
import AccountContext from "../../contexts/AccountContext";

const {clipboard} = window.require('electron');
const SteamTotp = window.require('steam-totp');

const steamOffset = () => 30 - Math.floor(((Date.now() % 1688340270000) / 30000 - Math.floor((Date.now() % 1688340270000) / 30000)) * 30);

export default function SteamGuard() {
    let [steamGuardCode, setSteamGuardCode] = useState("-----");
    const [secondsRemaining, setSecondsRemaining] = useState(steamOffset());
    const [backgroundWidth, setBackgroundWidth] = useState('100%');
    const {activeAccount, setActiveAccount} = useContext(AccountContext);

    useEffect(()=> {
      if(!activeAccount) return;
      let s_key = activeAccount.guard?.shared_secret ;
      if(!s_key) return setSteamGuardCode("-----");
      const code = SteamTotp.generateAuthCode(s_key);
      setSteamGuardCode(code);
    }, [activeAccount]);

    useEffect(()=> {
      const updateSteamGuardCode = () => {
        let s_key = activeAccount ? activeAccount.guard?.shared_secret : undefined;
        if(!s_key) {
          setSecondsRemaining(steamOffset()-1);
          return setSteamGuardCode("-----");
        }
        const code = SteamTotp.generateAuthCode(s_key);
        setSteamGuardCode(code);
        setSecondsRemaining(steamOffset()-1);
      };
      if(secondsRemaining < 1) updateSteamGuardCode();
    }, [activeAccount, secondsRemaining])

    useEffect(() => {
      
      const timer = setInterval(() => {
        setSecondsRemaining((prevSeconds) => prevSeconds - 1);
      }, 1000);


      return () => {
        clearInterval(timer);
      };
    }, []);

    useEffect(() => {
      const calculateBackgroundWidth = () => {
        const width = (secondsRemaining / 30) * 100;
        setBackgroundWidth(`${width}%`);
      };
      calculateBackgroundWidth();
    }, [secondsRemaining]);


    const handleCopyToClipboard = () => {
      clipboard.writeText(steamGuardCode);
    };

    return <section className="steam-guard-inner">
      <div className="steam-guard-wrapper">
        <div className="steam-guard-line" style={{ width: backgroundWidth }} />
        <div className="steam-guard-copy nDragble" onClick={handleCopyToClipboard}>
          <ContentCopyIcon />
        </div>
        <span className="steam-guard-code">{steamGuardCode}</span>
      </div>
    </section>
}