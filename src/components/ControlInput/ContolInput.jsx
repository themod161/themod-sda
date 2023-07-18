import React, { useState } from 'react';
import './ControlInput.css';
import EditIcon from '@mui/icons-material/Edit';
import DoneIcon from '@mui/icons-material/Done';

const ControlInput = (props) => {
  const { title, value, onChange, ...inputProps } = props;

  const handleClick = () => {
    onChange({target: {value: !value}});
  };

  return (
    <div className="text-input nDragble">
      <label>{title}</label>
      <div className='text-input-wrapper'>
        <div className={`checkbox-input${value ? ' active' : ''}`} onClick={handleClick}>
          <div className="checkbox-status"></div>
        </div>
        <input type="checkbox" style={{ display: "none" }}  {...inputProps} />
      </div>
    </div>
  );
};

export default ControlInput;
