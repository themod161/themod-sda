import { useState } from 'react';
import './AddUser.css';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { Navigate } from 'react-router-dom';
const electron = window.require('electron');
const {ipcRenderer} = electron;

export default function AddUser() {
    const [needRedirect, setNeedRedirect] = useState(false);
    const handleClick = () => {
       
        setNeedRedirect(true);
    }
    if(needRedirect) {
        return <Navigate to={'/login'}></Navigate>
    }
    return <div className='add-user-inner nDragble'>
        <div
            className={`add-user-field nDragble nSelected`}
            style={{ cursor: 'pointer' }}
            onClick={handleClick}
        >
            <span className='add-user-icon'><PersonAddAlt1Icon/></span><span className="add-user-text">Add new account</span>
        </div>
        
    </div>
}