import './Confirmations.css';
import Confirmation from './Confirmation';
import { useContext, useEffect, useState } from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import ClientContext from '../../contexts/ClientContext';
import { addNotify } from '../Notify/Notify';
import { Block, Check } from '@mui/icons-material';

const app = window.require('electron');
const {ipcRenderer} = app;
export default function Confirmations() {
    let [confirmations, setConfirmations] = useState([]);
    
    let [error, setError] = useState("");
    const accountSession = useContext(ClientContext);
    let [status, setStatus] = useState(accountSession.loginStatus);
    
    const fetchConfirmations = async () => {
        if(!accountSession.guard) return;
            let a = await ipcRenderer.invoke('get-confirmations-list', accountSession.account_name);
        
            if(a.error) {
                ipcRenderer.send('logger',`(${accountSession.account_name}) {CONFIRMATIONS} ${a.error.message}`, "error")
                return addNotify(`${a.error.message.includes('Error:') ? `${a.error}` : `Error: ${a.error}`}`, 'error');
            }
            else if(error != "") setError("");
            let newData = a.filter(item => {
                return !confirmations.some(existingItem => existingItem.id === item.id)
            });
            if(newData.length == 0) return;
            newData.forEach(item => {
                if(item.sending.includes(`You will`) ? accountSession.auto_confirm_trades : accountSession.auto_confirm_market) return;
               
                ipcRenderer.send('add-notification', {
                    id: item.id,
                    icon: item.icon,
                    title: accountSession.display_name || accountSession.account_name,
                    account_name: accountSession.account_name,
                    message: item.sending.includes(`You will`) ? `${item.sending}
${item.receiving}` : `You selling ${item.sending} ${item.title.split('Selling ')[1] || 100}`,
                    actions: [{icon: 'check', data: 'accept'}, {icon: 'block', data: 'decline'}]
                });
            })
            setConfirmations((prev) => [...prev, ...newData]);
        
    };
    let fetchTrades = async (replace = false) => {
        let b = await await ipcRenderer.invoke('get-offers-list', accountSession.account_name);
        if(b.error) {
            ipcRenderer.send('logger',`(${accountSession.account_name}) {CONFIRMATIONS} ${b.error.message}`, "error")
            return;
        }
        let newData;
        if(replace) newData = b || [];
        else newData = b?.filter(item => !confirmations.some(existingItem => existingItem.id === item.id)) || [];
        if(newData.length == 0) return;
        
        newData.forEach(tradeOffer=> {
            console.log(tradeOffer);
            if(accountSession.auto_confirm && tradeOffer.tradeOffer.itemsToGive.length == 0) return;
            ipcRenderer.send('add-notification', {
                id: tradeOffer.id,
                icon: tradeOffer.tradeInformation.them.avatarFull,
                title: accountSession.display_name || accountSession.account_name,
                account_name: accountSession.account_name,
                message: `${tradeOffer.tradeInformation.them.personaName} sent you trade offer.\nYou will receive ${tradeOffer.tradeOffer.itemsToReceive.length}.\nYou will give ${tradeOffer.tradeOffer.itemsToGive.length}.`,
                actions: [{icon: 'check', data: 'accept'}, {icon: 'block', data: 'decline'}]
            });
        })
        setConfirmations((prev) => [...prev, ...newData]);
    }
    useEffect(()=> {
        if(!accountSession.guard) return;
        
        fetchTrades();
        
        let addNewOffer = async(newOffer) => {
            ipcRenderer.send('logger',`(${accountSession.account_name}) New offer`, "log");
            if(!accountSession.auto_confirm && !newOffer.tradeOffer.itemsToGive.length == 0) {
                ipcRenderer.send('add-notification', {
                    id: newOffer.id,
                    icon: newOffer.tradeInformation.them.avatarFull,
                    title: accountSession.display_name || accountSession.account_name,
                    account_name: accountSession.account_name,
                    message: `${newOffer.tradeInformation.them.personaName} sent you trade offer.\nYou will receive ${newOffer.tradeOffer.itemsToReceive.length}.\nYou will give ${newOffer.tradeOffer.itemsToGive.length}.`,
                    actions: [{icon: 'check', data: 'accept'}, {icon: 'block', data: 'decline'}]
                });
            };
            setConfirmations((prev) => [newOffer, ...prev]);
        };
        ipcRenderer.on('new-offer', (event, data) => {
            if(!confirmations.some(existingItem => existingItem.id === data.id)) 
                addNewOffer(data);
        })
        return () => {
            ipcRenderer.off('new-offer', ()=> {});
        }
    }, [accountSession])
    useEffect(()=> {
        fetchConfirmations();
        const intervalId = setInterval(fetchConfirmations, 15000);
        
        return () => {
            clearInterval(intervalId);
        };
    }, [confirmations, accountSession]);
    if(!accountSession.guard) return <h1>You need add/import Steam Guard (.maFile)</h1>
    const handleButtonClick = () => {
        setConfirmations([]);
        fetchTrades(true);
        fetchConfirmations();
    };
    return <section className="confirmations-list-inner">
        <div className='confirmation-refresh-button nDragble' onClick={handleButtonClick}>
            Refresh
        </div>
        <div className="confirmations-list nDragble">
            {error && error.message}
            <TransitionGroup>
                {!error && confirmations.map((confirmation,i)=> <CSSTransition key={confirmation.id} timeout={500} classNames="confirmation"><Confirmation key={confirmation.id} thisConfirmation={confirmation} setConfirmations={setConfirmations}/></CSSTransition>)}
            </TransitionGroup>
        </div>
    </section>
}