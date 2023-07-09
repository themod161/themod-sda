import { useContext } from "react";
import "./Toolbar.css";
import AccountContext from "../../contexts/AccountContext";
const electron = window.require('electron');
export default function Toolbar() {
    const {activeAccount, setActiveAccount} = useContext(AccountContext);
    const importFunction = () => {
        electron.ipcRenderer.send('import-account');
    }
    const refreshFunction = () => {
        electron.ipcRenderer.send('need-load-accounts');
    }
    return <section className="toolbar-inner">
        <div className="toolbar-button nDragble" onClick={importFunction}>
            Import
        </div>
        <div className="toolbar-button nDragble" onClick={refreshFunction}>
            Refresh
        </div>
    </section>
}