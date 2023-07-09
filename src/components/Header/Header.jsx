import Logo from '../../img/logo.png';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import './Header.css';
const electron = window.require('electron');

export default function Header() {
    const minimizeWindow = () => {
        electron.ipcRenderer.send('minimize-window');
    };
    
    const closeWindow = () => {
        electron.ipcRenderer.send('close-window');
    };
    return <section className="header-inner">
        <div className="header-left-side">
            <div className="header-logo">
                <img src={Logo} width={24} height={24} alt='logo'/>
            </div>
            <div className="header-app-name">
                themod
            </div>
        </div>
        <div className="header-right-side">
            <div className="header-buttons">
                <div className="header-buttons-wrapper nDragble" onClick={minimizeWindow}>
                    <RemoveIcon className="header-button nDragble nSelected"/>
                </div>
                <div className="header-buttons-wrapper close nDragble" onClick={closeWindow}>
                    <CloseIcon className="header-button nDragble nSelected"/>
                </div>
            </div>
        </div>
    </section>
}