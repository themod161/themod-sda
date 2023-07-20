import { useEffect, useState } from 'react';
import Client from '../steamUtils/client.class';
import { Proxy, parseProxy } from '../steamUtils/proxy.class';
import TelegramIcon from '@mui/icons-material/Telegram';
import './Settings.page.css'
import TextInput from '../components/TextInput/TextInput';
import TextComponent from '../components/Text/Text';
import { setSettings } from '../steamUtils/utils.class.js';
import Logger from '../steamUtils/logger.class';

const { ipcRenderer } = window.require('electron');


export default function AppSettings() {
    let [appData, setAppData] = useState({});
    useEffect(() => {
        ipcRenderer.on('settings-load', async (event, settings) => {
            setAppData({
                bot_token: settings.bot_token || '',
                user_id: settings.user_id || ''
            })
        });
    }, []);
    const saveAppSettings = () => {
        setSettings(appData);
        ipcRenderer.send('update-app-settings');
    }

    const changeField = (e, field) => {
        let newObj = {};
        
        if(typeof e.target.value === 'string') e.target.value = e.target.value.replace(/\s/g, '');
        newObj[field] = e.target.value;
        
        setAppData((prev)=> ({...prev, ...newObj}));
    } 
    if (Object.keys(appData).length === 0 ) return <>Loading...</>;
    return (
        <div className='settings-page-inner nDragble nSelected'>
            <h2>App settings</h2>
            <div className='settings-page-title'><h3><TelegramIcon/> Telegram</h3></div>
            <hr/>
            <TextInput title={`Telegram bot token:`} hide={true} needHide={true} onComplete={saveAppSettings} onInput={(e)=> changeField(e, "bot_token")} value={appData.bot_token} />
            <TextInput title={`User id:`} onComplete={saveAppSettings} onInput={(e)=> changeField(e, "user_id")} value={appData.user_id} />
        </div>
    );
}