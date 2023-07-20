import React, { useState } from 'react';
import './TextInput.css';
import EditIcon from '@mui/icons-material/Edit';
import DoneIcon from '@mui/icons-material/Done';
import VisibilityIcon from '@mui/icons-material/Visibility';
const { shell } = window.require('electron');

const TextInput = (props) => {
    const {title, onComplete, hide, needHide, ...inputProps} = props;
    const [isInput, setIsInput] = useState(props.disabled ? true : false);
    const [hidden, setHidden] = useState(hide ? hide : false);
    const handleOnClickSave = (e) => {
        if(props.disabled) return;
        setIsInput(false);
        if(onComplete) onComplete();
    }
    const handleOnClick = () => {
        if(props.disabled) return;
        setIsInput(true); 
    }
    const getBotToken = () => {
        shell.openExternal('https://t.me/BotFather');
    }
    const hideText = () => {
        setHidden(prev=> !prev);
    } 
    return (
        <div className="text-input nDragble">
            {title == "Telegram bot token:" ? <span className='text-get-bot-token-inner'>{title}<span className='text-get-bot-token' onClick={getBotToken}>*get*</span></span> : title}
            {isInput ? props.disabled ? <div className='text-input-stable-edit'><span>{inputProps.value}</span></div> : <div className='text-input-wrapper'><input type="text" {...inputProps} /><div className='text-input-save-button' onClick={handleOnClickSave}><DoneIcon/></div></div> : <div className='text-input-stable-edit'><span>{hidden ? inputProps.value.replace(/./g, '*').slice(0, 10) : inputProps.value}</span>{needHide ? <div onClick={hideText} className={`text-input-show-button${hidden ? ' active' : ''}`}><VisibilityIcon /></div>: <></>}<div onClick={handleOnClick} className='text-input-edit-button'><EditIcon /></div></div>}
        </div>
    );
};

export default TextInput;