import { useContext, useEffect, useRef, useState } from 'react';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { ArrowBack } from '@mui/icons-material';
import ClientContext from '../../../contexts/ClientContext';
import TradeItem from '../../TradeItem/TradeItem';
import { addNotify } from '../../Notify/Notify';

const electron = window.require('electron');
const {ipcRenderer} = electron;

export default function ConfirmationTrade({thisConfirmation, sets}) {
    const accountSession = useContext(ClientContext);
    const [tradeInfo, setTradeInfo] = useState();
    const [processStatus, setProcessStatus] = useState(false);
    const mainComponentRef = useRef();
    const mainComponentOpponentRef = useRef();
 
    useEffect(()=> {
        if(accountSession.auto_confirm_trades) {
            answerConfirmation(true);
        }
    }, [accountSession.auto_confirm_trades]);
    useEffect(()=> {
        const getTradeInfo = async () => {
            let response = await ipcRenderer.invoke('get-trade-info', {offerId: thisConfirmation.offerID, account_name: accountSession.account_name});
            if(response.error) return ipcRenderer.send('logger',response.error, "error");

            setTradeInfo(response);
        }
        getTradeInfo();
        ipcRenderer.on('data-notification', (event, data) => {
            if(thisConfirmation.id == data.id) answerConfirmation(data.data == "accept");
        })
        return () => {
            ipcRenderer.off('data-notification', ()=> {});
        }
    }, []);
    const openOpponentProfile = ()=> {
        console.log(tradeInfo);
        electron.shell.openExternal(`https://steamcommunity.com/profiles/${tradeInfo.partner.steamID64}/`)
    }
    const answerConfirmation = async (value = false) => {
        if(processStatus) return addNotify(`Wait for response!`, 'info');
        setProcessStatus(true);
        try {
            let response = await ipcRenderer.invoke('answer-to-confirmation', accountSession.account_name, thisConfirmation.id, thisConfirmation.key, value);
            addNotify(response, 'success');
            ipcRenderer.send('logger',`(${accountSession.account_name}) ${response}`, "log");
            ipcRenderer.send('remove-notification', thisConfirmation.id);
            sets((prev)=> [...prev.filter(x=> x.id !== thisConfirmation.id)]);
            setProcessStatus(false);
        } catch (error) {
            ipcRenderer.send('logger',`(${accountSession.account_name}) {CONF TRADE} ${error.message}`, "error");
            addNotify(error.message, 'error');
        }
    };
    return <>
        <div className="confirmation-inner" id={`conf${thisConfirmation.id}`}>
            <div className="confirmation-header">
                <div className='confirmation-header-left'>
                    <div className='confirmation-me-inner'>
                        Me
                    </div>
                </div>
                <div className='confirmation-arrow'>
                    {tradeInfo?.isOurOffer ? <ArrowForwardIcon /> : <ArrowBack />}
                </div>
                <div className='confirmation-header-right'>
                    <div className='confirmation-opponent-inner' onClick={openOpponentProfile} style={{cursor: 'pointer'}}>
                        <div className='confirmation-opponent-img'>
                            <img src={thisConfirmation.icon} alt={thisConfirmation.sending}/>
                        </div>
                        <div className='confirmation-opponent-name'>
                            {thisConfirmation.title ? thisConfirmation.title.replace('Trade Offer - ', '') : ""}
                        </div>
                        
                    </div>
                </div>
            </div>
            <div className="confirmation-body">
                <div className="confirmation-items-inner">
                    <div className='confirmation-items-left'>
                        <div className='items-inner' ref={mainComponentRef}>
                            {(tradeInfo?.itemsToGive ? tradeInfo.itemsToGive : []).map((item, i) => <TradeItem key={item.id} mainComponentRef={mainComponentRef} item={item} index={i} partner={accountSession.guard.Session.SteamID}/>)}
                        </div>
                    </div>
                    <div className='confirmation-items-line'></div>
                    <div className='confirmation-items-right'>
                        <div className='items-inner' ref={mainComponentOpponentRef}>
                            {(tradeInfo?.itemsToReceive ? tradeInfo.itemsToReceive : []).map((item, i) => <TradeItem key={item.id} mainComponentRef={mainComponentOpponentRef} item={item} index={i} partner={tradeInfo.partner}/>)}
                        </div>
                    </div>
                </div>
                {tradeInfo?.message ? <div className='confirmation-description'>
                    Message: {tradeInfo.message}
                </div> : <></>}
                
            </div>
            <div className="confirmation-buttons nDragble">
                <div className='confirmation-button nDragble nSelected accept' onClick={()=>answerConfirmation(true)}> Accept</div>
                <div className='confirmation-button nDragble nSelected decline' onClick={()=>answerConfirmation()}>Decline</div>
            </div>
        </div>
    </>
}