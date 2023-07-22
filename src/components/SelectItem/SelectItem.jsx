import React, { useState } from 'react';
import './SelectItem.css';
import EditIcon from '@mui/icons-material/Edit';
import DoneIcon from '@mui/icons-material/Done';

const SelectItem = (props) => {
    let {title, onComplete, value, ...inputProps} = props;
    const [isInput, setIsInput] = useState(props.disabled ? true : false);
    //if(value && value.toLowerCase() == 'socks') value = 'http';
    const handleOnClickSave = (e) => {
        if(props.disabled) return;
        setIsInput(false);
        if(onComplete) onComplete();
    }
    const handleOnClick = () => {
        if(props.disabled) return;
        setIsInput(true); 
    } 
    return (
        <div className="text-input nDragble">
            <label>{title}</label>
            {isInput ? 
                props.disabled 
                ? 
                    <div className='text-input-stable-edit'>
                        <span>{value?.toUpperCase() || "HTTP"}</span>
                    </div> 
                    : 
                    <div className='text-input-wrapper'>
                        <select value={value?.toLowerCase() || "http"} {...inputProps}>
                            <option value="http">HTTP</option>
                            <option value="https">HTTPS</option>
                            <option value="socks">SOCKS</option>
                        </select>
                        <div className='text-input-save-button' onClick={handleOnClickSave}>
                            <DoneIcon/>
                        </div>
                    </div> 
                : 
                <div className='text-input-stable-edit'>
                    <span>{value?.toUpperCase() || "HTTP"}</span>
                    <div onClick={handleOnClick} className='text-input-edit-button'>
                        <EditIcon />
                    </div>
                </div>}
        </div>
    );
};

export default SelectItem;