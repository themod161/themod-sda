import { useContext } from "react";
import "./Toolbar.css";
import AccountContext from "../../contexts/AccountContext";
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Settings } from "@mui/icons-material";
const electron = window.require('electron');
export default function Toolbar() {
    const {activeAccount, setActiveAccount} = useContext(AccountContext);
    const importFunction = () => {
        electron.ipcRenderer.send('import-account');
    }
    const refreshFunction = () => {
        electron.ipcRenderer.send('need-load-accounts');
    }
    const settingsFunction = () => {
        electron.ipcRenderer.send('open-settings');
    }
    return <section className="toolbar-inner">
        <div className="toolbar-button nDragble" onClick={importFunction}>
            <GroupAddIcon/>Import
        </div>
        <div className="toolbar-button nDragble" onClick={refreshFunction}>
            <RefreshIcon/>Refresh
        </div>
        <div className="toolbar-button nDragble" onClick={settingsFunction}>
            <Settings/>Settings
        </div>
    </section>
}