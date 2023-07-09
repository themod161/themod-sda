import { useState } from 'react';
const {ipcRenderer} = window.require('electron');

export default function AddGuard({activeAccount}) {
    let [login, setLogin] = useState("");
    let [password, setPassword] = useState("");

    const handleLogin = (e) => {
        setLogin(e.target.value);
    }
    const handlePassword = (e) => {
        setPassword(e.target.value);
    };
    const tryLogin = async (e) => {
       
       
        ipcRenderer.send('try-add-guard', login, password);
    }
    return (
        <>
            <label htmlFor="login">Login</label>
            <input id="login" type="text" onInput={handleLogin} className='nDragble'/>
            <label htmlFor="password">Password</label>
            <input id="password" type='password' onInput={handlePassword} className='nDragble'/>
            <button onClick={tryLogin} className='nDragble'>Login</button>
        </>
    );
}