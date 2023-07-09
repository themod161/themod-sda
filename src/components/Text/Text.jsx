import React, { useState } from 'react';
import './Text.css';

const TextComponent = ({title, value}) => {
    return (
        <div className="text-input nDragble">
            <label>{title}</label>
            <div className='text-input-stable-edit'>
                <span>{value}</span>
            </div>
        </div>
    );
};

export default TextComponent;