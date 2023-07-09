import { useContext, useEffect, useState } from 'react';
import './Notification.css';
import { Close, Check, Block } from '@mui/icons-material';
import sound from './../../assets/alert.mp3';

const electron = window.require('electron');
const path = window.require('path');
const { ipcRenderer } = electron;
function ButtonNotification({ data, notificationWindow, id, onClick, close }) {

    const handleClick = (e) => {
        e.stopPropagation();
        if (onClick) onClick();
        else {
            ipcRenderer.send('data-notification', {
                windowFrom: notificationWindow,
                id,
                data: data.data
            });
            close();
        }
    }
    if (typeof data.icon == 'string') switch (data.icon) {
        case 'block': return data.icon = <Block />;
        case 'check': return data.icon = <Check />;
    }
    return <div className="notification-button" onClick={handleClick}>
        {data.icon}
    </div>
}

export default function Notification({ notification, removeNotification, musicPlayed, setMusicsPlayed }) {
    const [needDelete, setNeedDelete] = useState(true);
    const [timer, setTimer] = useState();
    useEffect(() => {
        if (needDelete) {
            setTimer(setTimeout(() => {
                close();
            }, 15000));
        }
        else {
            clearTimeout(timer);
            setTimer(undefined)
        }
    }, [needDelete])
    useEffect(() => {
        if (musicPlayed) return;
        setMusicsPlayed((prev) => [...prev, notification.id]);
        const audio = new Audio(sound);
        audio.onload = () => {
            audio.play();
        }
        

        audio.onended = () => {
            audio.remove();
        };

       
        return () => {
            setTimeout(() => {
                if(audio.duration > 0 && !audio.paused) audio.pause();
                audio.remove();
            }, 0);
        };
    }, []);

    const close = () => {
        removeNotification(notification.id);
    };


    return (

        <div
            className="notification-inner nDragble nSelected"
            onMouseEnter={() => setNeedDelete(false)}
            onMouseLeave={() => setNeedDelete(true)}
            onClick={() => { ipcRenderer.send('show-window', notification.windowFrom, notification.id); close(); }}
        >
            <div className="notification-left-side">
                <img src={notification.icon || "logo.ico"} alt="Notification Icon" />
            </div>
            <div className="notification-right-side">
                <div className="notification-text">
                    <div className="notification-title">
                        {notification.title}
                    </div>
                    <div className="notification-message">{notification.message}</div>
                </div>
            </div>
            <div className="notification-action">
                <ButtonNotification data={{ icon: <Close />, data: 'close' }} id={notification.id} onClick={close} />
                {notification.actions.map((x, i) => (
                    <ButtonNotification data={x} key={i} id={notification.id} notificationWindow={notification.windowFrom} close={close} />
                ))}
            </div>
        </div>
    );
}