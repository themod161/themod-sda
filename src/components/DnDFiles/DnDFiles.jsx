import './DnDFiles.css';

import React, { useRef, useState } from 'react';

const electron = window.require('electron');
const {ipcRenderer} = electron;
const fs = window.require('fs')

export default function DnDFiles() {
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);

    const fileInputRef = useRef();
    const handleDragEnter = (event) => {
        event.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        setDragging(false);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
    };

    const handleDrop = async (event) => {
        event.preventDefault();
        setDragging(false);

        const files = event.dataTransfer.files;
        if(files.length > 0) sendFiles(files);
        
    };
    function fileListToObject(fileList) {
        const filesArray = Array.from(fileList);
      
        const fileObjects = filesArray.map((file) => ({
          name: file.name,
          type: file.type,
          path: file.path,
          size: file.size,
          lastModified: file.lastModified,
        }));
      
        return fileObjects;
    }
    const handleClick = () => {
        fileInputRef.current.click();   
    }
    const sendFiles = (files) => {
        ipcRenderer.send('try-add-accounts-by-file', fileListToObject(files).map(x=> fs.readFileSync(x.path).toString('utf-8')));
        setLoading(true);
    }
    const handleFileInputChange = (event) => {
        const files = event.target.files;
        if(files.length > 0) sendFiles(files);
    };
    return (
        <div
            className={`drag-drop-field${dragging ? ' dragging' : ''} nDragble nSelected`}
            style={{ cursor: 'pointer' }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            <span className="drag-drop-text">Drag&Drop files here</span>
            <br />
            <span className="or-text">or</span>
            <br />
            <input type="file" disabled={loading} ref={fileInputRef} className="file-input" accept=".maFile" multiple={true} onChange={handleFileInputChange}/>
            <span className="browse-text">Choose files</span>
        </div>
    );
};
