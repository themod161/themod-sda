import { useContext, useEffect, useState } from 'react';
import './Account.css';
import AccountContext from '../../contexts/AccountContext';
import { addNotify } from '../Notify/Notify';
import CustomContextMenu from '../ContextMenu/ContextMenu';
import ContextMenuContext from '../../contexts/ContextMenuContext';
import { ExpandLess, ExpandMore, Refresh } from '@mui/icons-material';
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import AccountsContext from '../../contexts/AccountsContext';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import ListIcon from '@mui/icons-material/List';
const electron = window.require('electron');
const {ipcRenderer} = electron;

export default function Account({account, isDragOver, dragItem, dragStart, dragEnter, drop, index}) {
    const {activeAccount, setActiveAccount} = useContext(AccountContext);
    const {accounts, setAccounts} = useContext(AccountsContext);
    const [contextMenu, setContextMenu] = useState(false);
    
    const handleContextMenu = (event) => {
        event.preventDefault();
        setContextMenu(true);
    };
    const handleMenuItemClick = (menuItem) => {
        switch(menuItem) {
            case 0: {
                console.log(account);
                if(!account.guard) return addNotify(`First you need to add maFile (steam guard)`, 'info');
                electron.ipcRenderer.send('open-account-confirmations', account);
                return;
            }
            case 1: {
                return electron.ipcRenderer.send('toggle-guard', account);    
            }
            case 2: {
                return electron.ipcRenderer.send('re-login', account);
            }
            
            case 3: {
                return electron.ipcRenderer.send('open-account-settings', account);
            }
            case 4: {
                ipcRenderer.send('remove-account', account.account_name);
                setActiveAccount(undefined);
                return electron.ipcRenderer.send('need-load-accounts');    

            }
            default: return;
        }
    };

    const handleDoubleClick = ()=> {
        if(!account.guard) return addNotify(`First you need to add maFile (steam guard)`, 'info');
        electron.ipcRenderer.send('open-account-confirmations', account);
    }
    const handleStartDrag = (e) => {
        dragStart(e, index);
    }
    const handleEnterDrag = (e) => {
        dragEnter(e, index);
    }
    const handleClick = () => {
        if(activeAccount?.account_name != account.account_name) setActiveAccount(account);
    }
    return <>
        <div className={'account-inner'} 
            draggable
            onDragStart={handleStartDrag}
            onDragEnter={handleEnterDrag}
            onDragEnd={drop}
            drag="true"
            >
            {isDragOver && isDragOver == index && isDragOver < dragItem.current ? <div className='account-drag-over-line'></div> : <></>}
            <div className={`account-wrapper nDragble${activeAccount?.account_name == account.account_name ? " active" : ""}${contextMenu ? ' opened' : ''}`} onDoubleClick={handleDoubleClick} onClick={handleClick} onContextMenu={handleContextMenu}>
                <div className='account-left nSelected'>
                    {account.avatar_url ? <img src={account.avatar_url} draggable="false" /> : <></>}
                    <span className="account-left-username">{account.display_name ||account.account_name}</span>
                </div>
                <div className='account-right'>
                    <div className='account-right-button-open' onClick={()=> setContextMenu((prev)=> !prev)}>
                        {contextMenu ? <ExpandLess/> : <ExpandMore /> }
                    </div>
                </div>
            </div>

            <TransitionGroup>
                {contextMenu ? (<CSSTransition timeout={500} classNames="account"><CustomContextMenu
                onMenuItemClick={handleMenuItemClick}
                items={[{text: 'Open confirmations', icon: <ListIcon />}, {text: `${account?.guard ? "Remove" : "Add"} Guard`, icon: <SecurityIcon />},{text: `Re-login`, icon: <Refresh/>}, {text: "Settings", icon: <SettingsIcon />}, {text: "Exit", icon:<LogoutIcon />}]}
                /></CSSTransition>) : <></>}
            </TransitionGroup>
            {isDragOver && isDragOver == index && isDragOver >= dragItem.current ? <div className='account-drag-over-line'></div> : <></>}
        </div>
    </>
}