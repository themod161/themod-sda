import { useState, useEffect } from 'react';
import Notification from '../components/Notifications/Notification';
import './Notifications.page.css';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import Logger from '../steamUtils/logger.class';
const { ipcRenderer } = window.require('electron');
export default function NotificationPage() {
    const [notifications, setNotifications] = useState([]);
    const [activeNotifications, setActiveNotifications] = useState([]);
    const [visible, setVisible] = useState(false);
    const [musicsPlayed, setMusicsPlayed] = useState([]);

    useEffect(() => {
        const addNotificationHandler = (event, data) => {
            new Logger("New notification", "log");
            setNotifications(prevNotifications => [...prevNotifications, data]);
        };
        const removeNotificationHandler = (event, data) => {
            setNotifications(prevNotifications => prevNotifications.filter(x=> x.id !== data));
        };
        ipcRenderer.on('add-notification', addNotificationHandler);
        ipcRenderer.on('remove-notification', removeNotificationHandler);
        return () => {
            ipcRenderer.off('add-notification', addNotificationHandler);
            ipcRenderer.off('remove-notification', removeNotificationHandler)
        };
    }, []);
    

    useEffect(() => {
        setActiveNotifications(notifications.slice(0, 3));
    }, [notifications]);
    useEffect(()=> {
        if(notifications.length === 0 && visible) {
            ipcRenderer.send('hide-window');
            
            setActiveNotifications([]);
            setNotifications([]);
            setVisible(false);
        }
        else if(activeNotifications.length > 0 && !visible) {
            ipcRenderer.send('show-window');
            setVisible(true);
        }
    }, [activeNotifications, visible, notifications.length]);
    const removeNotification = id => {
        setMusicsPlayed(prev=> prev.filter(x=> x != id));
        setActiveNotifications(prevNotifications =>
          prevNotifications.filter(notification => notification.id !== id)
        );
        setNotifications(prevNotifications =>
          prevNotifications.filter(notification => notification.id !== id)
        );
      };
    return (
        <div className='notifications-inner'>
            <TransitionGroup>
                {activeNotifications.map((notification, i) => (
                    <CSSTransition key={notification.id} classNames='notification-inner' timeout={300}>
                        <Notification
                            key={i}
                            notification={notification}
                            removeNotification={removeNotification}
                            musicPlayed={musicsPlayed.find(x=> x == notification.id)}
                            setMusicsPlayed={setMusicsPlayed}
                        />
                    </CSSTransition>
                ))}
            </TransitionGroup>
            <div className="notifications-clear-button nDragble nSelected" onClick={()=> {
                notifications.forEach(x=> removeNotification(x.id));
                setNotifications([]);
            }}>
                Clear All
            </div>
        </div>
    );
}