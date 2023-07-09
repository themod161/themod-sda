import { useState, useEffect } from 'react';
import './Input.page.css';
const {ipcRenderer} = window.require('electron');

export default function InputPage() {
    let [title, setTitle] = useState("Enter code: ");
    let [input, setInput] = useState("");

    useEffect(()=> {
        ipcRenderer.on('wait-for-input', (event, text)=> {
            setTitle(text);
        })
    }, [])
    const submitInput = () => {
        ipcRenderer.send('response-wait-for-input', input)
    }
    return (
        <div className='input-inner'>
            <span>{title}</span>
            <div className='input-class'>
                <input className='nDragble' type="text" onInput={(e)=> setInput(e.target.value)} />
            </div>
            
            <div onClick={submitInput} className='input-button nDragble'>Continue</div>
        </div>
    );
}