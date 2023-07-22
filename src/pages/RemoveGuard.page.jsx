import { useEffect, useState } from 'react';
const {ipcRenderer} = window.require('electron');
const SteamSession = window.require('steam-session');
const SteamCommunity = window.require('steamcommunity');
const SteamTotp = window.require('steam-totp');
const FS = window.require('fs');

export default function AddGuard() {
    let [login, setLogin] = useState("");
    let [password, setPassword] = useState("");

    const handleLogin = (e) => {
        setLogin(e.target.value);
    }
    const handlePassword = (e) => {
        setPassword(e.target.value);
    };
    const tryLogin = async (e) => {
        ipcRenderer.send('try-remove-guard', login, password);
    }
    return (
        <>
            <label htmlFor="login">Login</label>
            <input id="login" type="text" onInput={handleLogin} className='nDragble'/>
            <label htmlFor="password">Password</label>
            <input id="password" type='password' onInput={handlePassword} className='nDragble'/>
            <button onClick={tryLogin} className='nDragble'>Remove</button>
        </>
    );
}