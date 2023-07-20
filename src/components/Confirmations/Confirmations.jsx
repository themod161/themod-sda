import './Confirmations.css';
import Confirmation from './Confirmation';
import { useContext, useEffect, useState } from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import ClientContext from '../../contexts/ClientContext';
import { addNotify } from '../Notify/Notify';
import Logger from '../../steamUtils/logger.class';
import { Block, Check } from '@mui/icons-material';

const app = window.require('electron');
const {ipcRenderer} = app;
export default function Confirmations() {
    let [confirmations, setConfirmations] = useState([]);
    
    let [error, setError] = useState("");
    const accountSession = useContext(ClientContext);
    let [status, setStatus] = useState(accountSession.loginStatus);
    
    const fetchConfirmations = async () => {
        if(!accountSession.account.guard) return;
        if(status !== "logged" && status !== "total" && status !== "error") {
            try {
                accountSession.setOnLoginStatusChanged((state)=> {
                    new Logger(`(${accountSession.getAccountName()}) {CHANGE LOGIN STATE} ${state}`, "log");
                });
                await accountSession.login();
            }
            catch (e) {
                new Logger(`(${accountSession.getAccountName()}) {FETCH CONFIRMATIONS} ${e.message}`, "error");
                if(e.message) setStatus("total");
                return addNotify(`${e.message}`, 'error');
            }
        }
        if(status === "logged") {
            let a = await accountSession.getConfirmationList();
        
            if(a.error) {
                new Logger(`(${accountSession.getAccountName()}) {CONFIRMATIONS} ${a.error.message}`, "error")
                return addNotify(`${a.error.message.includes('Error:') ? `${a.error}` : `Error: ${a.error}`}`, 'error');
            }
            else if(error != "") setError("");
            let newData = a.filter(item => {
                return !confirmations.some(existingItem => existingItem.id === item.id)
            });
            if(newData.length == 0) return;
            newData.forEach(item => {
                if(accountSession.account.auto_confirm) return;
               
                ipcRenderer.send('add-notification', {
                    id: item.id,
                    icon: item.icon,
                    title: accountSession.getDisplayName() || accountSession.getAccountName(),
                    account_name: accountSession.getAccountName(),
                    message: item.sending.includes(`You will`) ? `${item.sending}
${item.receiving}` : `You selling ${item.sending} ${item.title.split('Selling ')[1] || 100}`,
                    actions: [{icon: 'check', data: 'accept'}, {icon: 'block', data: 'decline'}]
                });
            })
            setConfirmations((prev) => [...prev, ...newData]);
        }
        
    };
    let fetchTrades = async (replace = false) => {
        let b = await accountSession.getOffersList();
        if(b.error) {
            new Logger(`(${accountSession.getAccountName()}) {CONFIRMATIONS} ${b.error.message}`, "error")
            return;
        }
        let newData;
        if(replace) newData = b || [];
        else newData = b?.filter(item => !confirmations.some(existingItem => existingItem.id === item.id)) || [];
        if(newData.length == 0) return;
        newData.forEach(tradeOffer=> {
            if(accountSession.account.auto_confirm && tradeOffer.tradeOffer.itemsToGive.length == 0) return;
            ipcRenderer.send('add-notification', {
                id: tradeOffer.id,
                icon: tradeOffer.tradeInformation.them.avatarFull,
                title: accountSession.getDisplayName() || accountSession.getAccountName(),
                account_name: accountSession.getAccountName(),
                message: `${tradeOffer.tradeInformation.them.personaName} sent you trade offer.\nYou will receive ${tradeOffer.tradeOffer.itemsToReceive.length}.\nYou will give ${tradeOffer.tradeOffer.itemsToGive.length}.`,
                actions: [{icon: 'check', data: 'accept'}, {icon: 'block', data: 'decline'}]
            });
        })
        setConfirmations((prev) => [...prev, ...newData]);
    }
    useEffect(()=> {
        if(!accountSession.account.guard) return;
        
        fetchTrades();
        let addNewOffer = async(offer) => {
            new Logger(`(${accountSession.getAccountName()}) New offer`, "log");
            let newOffer = await accountSession.getOfferByIdWithInfo(offer);
            if(!accountSession.account.auto_confirm && !newOffer.tradeOffer.itemsToGive.length == 0) {
                ipcRenderer.send('add-notification', {
                    id: newOffer.id,
                    icon: newOffer.tradeInformation.them.avatarFull,
                    title: accountSession.getDisplayName() || accountSession.getAccountName(),
                    account_name: accountSession.getAccountName(),
                    message: `${newOffer.tradeInformation.them.personaName} sent you trade offer.\nYou will receive ${newOffer.tradeOffer.itemsToReceive.length}.\nYou will give ${newOffer.tradeOffer.itemsToGive.length}.`,
                    actions: [{icon: 'check', data: 'accept'}, {icon: 'block', data: 'decline'}]
                });
            };
            setConfirmations((prev) => [newOffer, ...prev]);
        };
        accountSession.manager.on('newOffer', addNewOffer);
        return () => {
            
        }
    }, [accountSession])
    useEffect(()=> {
        fetchConfirmations();
        const intervalId = setInterval(fetchConfirmations, 15000);
        
        return () => {
            clearInterval(intervalId);
        };
    }, [confirmations, accountSession]);
    if(!accountSession.account.guard) return <h1>You need add/import Steam Guard (.maFile)</h1>
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