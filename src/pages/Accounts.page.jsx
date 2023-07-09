import ToolBar from '../components/Toolbar/Toolbar';
import SteamGuard from '../components/SteamGuard/SteamGuard';
import AccountsList from '../components/AccountsList/AccountsList';
import { getAccounts } from '../steamUtils/utils.class';
import { useEffect, useState } from 'react';
import AccountContext from '../contexts/AccountContext';
import { addNotify } from '../components/Notify/Notify';
import ContextMenuContext from '../contexts/ContextMenuContext';
import AccountsContext from '../contexts/AccountsContext';

const {ipcRenderer} = window.require('electron');

export default function Accounts() {
  let [accounts, setAccounts] = useState([]);
  let [activeAccount, setActiveAccount] = useState(undefined);
  const [contextMenu, setContextMenu] = useState(undefined);
  let loadAccounts = async (needChangeActiveAcc = false) => {
    let accounts = await getAccounts();
    setAccounts(accounts);
    if(needChangeActiveAcc || (!activeAccount && accounts.length > 0)) setActiveAccount(accounts[0]); 
    else if(accounts.find(x=> x.getAccountName() !== activeAccount?.getAccountName())) setActiveAccount(accounts[0] || undefined);
  }
  useEffect(()=> {
    
    loadAccounts();
    ipcRenderer.on('need-load-accounts', ()=> {
      loadAccounts();
    });
    ipcRenderer.on('update-account-by-username', async (event, account) => {
      loadAccounts();
    });
    ipcRenderer.on('add-notify', (event, title, type)=> addNotify(title, type));
  }, []);
  return (
    <AccountsContext.Provider value={{accounts, setAccounts}}>
      <AccountContext.Provider value={{activeAccount, setActiveAccount}}>
        <ContextMenuContext.Provider value={{contextMenu, setContextMenu}}>
          <ToolBar/>
          <SteamGuard activeAccount={activeAccount}/>
          <AccountsList accounts={accounts}/>
        </ContextMenuContext.Provider>
      </AccountContext.Provider>
    </AccountsContext.Provider>
  );
}