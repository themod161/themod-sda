import { useContext, useEffect, useState } from 'react';
import './Notification.css';
import { Close, Check, Block } from '@mui/icons-material';
import InputNotification from './Types/InputNotification';
import DefaultNotification from './Types/DefaultNotification';


const electron = window.require('electron');
const path = window.require('path');
const { ipcRenderer } = electron;

export default function switchNotification({ notification, removeNotification, musicPlayed, setMusicsPlayed }) {
    switch(notification.type) {
        case 'input': return <InputNotification notification={notification} removeNotification={removeNotification} musicPlayed={musicPlayed} setMusicsPlayed={setMusicsPlayed} />
        default: return <DefaultNotification notification={notification} removeNotification={removeNotification} musicPlayed={musicPlayed} setMusicsPlayed={setMusicsPlayed} />
    }
}
