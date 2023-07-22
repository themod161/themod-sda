import ToolBar from '../components/Toolbar/Toolbar';
import SteamGuard from '../components/SteamGuard/SteamGuard';
import AccountsList from '../components/AccountsList/AccountsList';
import { useEffect, useState } from 'react';
import AccountContext from '../contexts/AccountContext';
import { addNotify } from '../components/Notify/Notify';
import ContextMenuContext from '../contexts/ContextMenuContext';
import AccountsContext from '../contexts/AccountsContext';
import { Footer } from '../components/Footer/Footer';

const {ipcRenderer} = window.require('electron');

export default function Accounts() {
  let [accounts, setAccounts] = useState([]);
  let [activeAccount, setActiveAccount] = useState(undefined);
  const [contextMenu, setContextMenu] = useState(undefined);
  let loadAccounts = async (needChangeActiveAcc = false) => {
    let accounts = await ipcRenderer.invoke('get-accounts');
    console.log(accounts);
    setAccounts(accounts);
    if(needChangeActiveAcc || (!activeAccount && accounts.length > 0)) setActiveAccount(accounts[0]); 
    else if(accounts.find(x=> x.account_name !== activeAccount?.account_name)) setActiveAccount(accounts[0] || undefined);
  }
  useEffect(()=> {
    
    loadAccounts();
    ipcRenderer.on('need-load-accounts', ()=> {
      loadAccounts();
    });
    
    ipcRenderer.on('add-notify', (event, title, type)=> addNotify(title, type));
  }, []);
  return (
    <AccountsContext.Provider value={{accounts, setAccounts}}>
      <AccountContext.Provider value={{activeAccount, setActiveAccount}}>
        <ContextMenuContext.Provider value={{contextMenu, setContextMenu}}>
          <ToolBar/>
          <SteamGuard/>
          <AccountsList/>
          <Footer />
        </ContextMenuContext.Provider>
      </AccountContext.Provider>
    </AccountsContext.Provider>
  );
}