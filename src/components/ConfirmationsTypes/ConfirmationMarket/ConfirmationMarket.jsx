import { useContext, useEffect, useState } from 'react';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ClientContext from '../../../contexts/ClientContext';
import { addNotify } from '../../Notify/Notify';
import ShoppingCartCheckoutOutlinedIcon from '@mui/icons-material/ShoppingCartCheckoutOutlined';
import Logger from '../../../steamUtils/logger.class.js';

const electron = window.require('electron');
const {ipcRenderer} = electron;
export default function ConfirmationMarket({thisConfirmation, sets}) {
    const accountSession = useContext(ClientContext);
    const [processStatus, setProcessStatus] = useState(false);
    useEffect(() => {
        if(accountSession.account.auto_confirm) {
            answerConfirmation(true);
        }
    }, [accountSession]);
    useEffect(()=> {
            ipcRenderer.on('data-notification', (event, data) => {
                if(thisConfirmation.id == data.id) answerConfirmation(data.data == "accept");
            })
            return () => {
                ipcRenderer.off('data-notification', ()=> {});
            }
    }, []);
    const answerConfirmation = async (value = false) => {
        if(processStatus) return addNotify(`Wait for response!`, 'info');
        setProcessStatus(true);
        try {
            let response = await accountSession.answerToConfirmation(thisConfirmation.id, thisConfirmation.key, value);
            addNotify(response, 'success');
            new Logger(`(${accountSession.getAccountName()}) ${response}`, "log");
            ipcRenderer.send('remove-notification', thisConfirmation.id);
            sets((prev)=> [...prev.filter(x=> x.id !== thisConfirmation.id)]);
            setProcessStatus(false);
        } catch (error) {
            new Logger(`(${accountSession.getAccountName()}) {CONF MARKET} ${error}`, "error");
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
                    <ShoppingCartCheckoutOutlinedIcon />
                </div>
                <div className='confirmation-header-right'>
                    <div className='confirmation-opponent-inner'>
                        Market
                    </div>
                </div>
            </div>
            <div className="confirmation-body">
                <div className="confirmation-items-inner">
                    <div className='confirmation-items-left'>
                        <div className='items-inner'>
                            <div className='item-inner'>
                                <img src={thisConfirmation.icon} alt={thisConfirmation.sending}/>
                            </div>
                        </div>
                    </div>
                    <div className='confirmation-items-line'>
                        
                    </div>
                    <div className='confirmation-items-right'>
                        
                    </div>
                </div>
                <div className='confirmation-description'>
                    {thisConfirmation.title.replace('Market Listing - ', '')}
                </div>
            </div>
            <div className="confirmation-buttons nDragble">
                <div className='confirmation-button nDragble nSelected accept' onClick={()=>answerConfirmation(true)}>Accept</div>
                <div className='confirmation-button nDragble nSelected decline' onClick={()=>answerConfirmation()}>Decline</div>
            </div>
        </div>
    </>
}