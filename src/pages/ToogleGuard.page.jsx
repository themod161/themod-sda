import { useEffect, useState } from 'react';
import { Route, BrowserRouter as Router, redirect } from 'react-router-dom';
import RemoveGuard from './RemoveGuard.page';
import AddGuard from './AddGuard.page';
const {ipcRenderer} = window.require('electron');

export default function ToogleGuard() {
  let [activeAccount, setActiveAccount] = useState(undefined);
  useEffect(()=> {
    ipcRenderer.on('account-load', async (event, account) => {
        setActiveAccount(account);
    });
  }, []);
  return (
    <>
        {activeAccount?.guard ? <RemoveGuard activeAccount={activeAccount}/> : <AddGuard activeAccount={activeAccount}/>}
    </>
  );
}