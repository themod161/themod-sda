import React, { useState } from 'react';
import './TextInput.css';
import EditIcon from '@mui/icons-material/Edit';
import DoneIcon from '@mui/icons-material/Done';

const TextInput = (props) => {
    const {title, onComplete, ...inputProps} = props;
    const [isInput, setIsInput] = useState(props.disabled ? true : false);
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
            {isInput ? props.disabled ? <div className='text-input-stable-edit'><span>{inputProps.value}</span></div> : <div className='text-input-wrapper'><input type="text" {...inputProps} /><div className='text-input-save-button' onClick={handleOnClickSave}><DoneIcon/></div></div> : <div className='text-input-stable-edit'><span>{inputProps.value}</span><div onClick={handleOnClick} className='text-input-edit-button'><EditIcon /></div></div>}
        </div>
    );
};

export default TextInput;