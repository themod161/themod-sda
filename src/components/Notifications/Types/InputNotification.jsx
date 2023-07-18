import { Close, Send } from "@mui/icons-material";
import { useState, useEffect } from "react";
import sound from './../../../assets/alert.mp3';
const {ipcRenderer} = window.require('electron');

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
    return <div className="notification-button" onClick={handleClick}>
        {data.icon}
    </div>
}
export default function InputNotification({ notification, removeNotification, musicPlayed, setMusicsPlayed }) {
    const [inputValue, setInputValue] = useState("");
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
            if(audio.duration > 0 && !audio.paused) audio.pause();
            audio.remove();
        };
    }, [musicPlayed, notification.id, setMusicsPlayed]);
    const onInputChange = (e) => {
        setInputValue(e.target.value);
    }
    const onSendClick = () => {
        ipcRenderer.send('data-notification', {
            windowFrom: notification.windowFrom,
            id: notification.id,
            data: 'send',
            value: inputValue
        });
        close();
    }
    const close = () => {
        removeNotification(notification.id);
    };


    return (

        <div
            className="notification-inner nDragble nSelected"
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
                    <div className="notification-input">
                        <input type="text" placeholder="Enter your value here" onChange={onInputChange} onClick={(e)=> e.stopPropagation()}/>
                    </div>
                </div>
            </div>
            <div className="notification-action">
                <ButtonNotification data={{ icon: <Close />, data: 'close' }} id={notification.id} onClick={close} />
                <ButtonNotification data={{ icon: <Send />, data: 'send'}} id={notification.id} notificationWindow={notification.windowFrom} onClick={onSendClick} />
            </div>
        </div>
    );
}