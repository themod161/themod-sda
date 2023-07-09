import { useContext, useEffect, useState } from 'react';
const electron = window.require('electron');


export default function LoginStatus({account}) {
    const [status, setStatus] = useState(account.loginStatus);
    useEffect(()=> {
        account.setOnLoginStatusChanged(setStatus);
    }, [])
    
    return <>
        <div className={`account-login-status ${status == 'error' ? 'red' : status == 'logged' ? 'green' : status == 'logging' ? 'orange' : ''}`}></div>
    </>
}