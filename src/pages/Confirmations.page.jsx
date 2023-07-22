import { useState, useEffect } from 'react';
import Confirmations from '../components/Confirmations/Confirmations';
import ClientContext from '../contexts/ClientContext';
const {ipcRenderer} = window.require('electron');

export default function ConfirmationsPage() {
  let [accountSession, setAccountSession] = useState({});
  useEffect(()=> {
    ipcRenderer.on('account-load', async (event, account) => {
        setAccountSession(account);
    });
    ipcRenderer.on('update-account-by-username', async (event, account) => {
      setAccountSession(account);
    });
  }, []);
  
  if(!accountSession || Object.keys(accountSession).length == 0) { return <>Loading...</>}
  return (
      <ClientContext.Provider value={accountSession}>
        <Confirmations/>
      </ClientContext.Provider>
  );
}