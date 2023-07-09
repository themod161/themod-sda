import { useEffect, useState } from 'react';
import Client from '../steamUtils/client.class';
import { Route, BrowserRouter as Router, redirect } from 'react-router-dom';
import RemoveGuard from './RemoveGuard.page';
import AddGuard from './AddGuard.page';
const {ipcRenderer} = window.require('electron');

export default function ToogleGuard() {
  let [activeAccount, setActiveAccount] = useState(undefined);
  useEffect(()=> {
    ipcRenderer.on('account-load', async (event, account) => {
        account = await new Client({}).restore(JSON.parse(account));
        setActiveAccount(account);
    });
  }, []);
  return (
    <>
        {activeAccount?.account.guard ? <RemoveGuard activeAccount={activeAccount}/> : <AddGuard activeAccount={activeAccount}/>}
    </>
  );
}