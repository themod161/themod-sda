import { useState, useEffect } from 'react';
import AddUser from '../components/AddUser/AddUser';
import HrLine from '../components/HrLine/HrLine';
import DnDFiles from '../components/DnDFiles/DnDFiles';
const {ipcRenderer} = window.require('electron');

export default function ImportPage() {
  const [files, setFiles] = useState([]);
  return (
      <div className="import-page-inner">
        <AddUser />
        <HrLine text={'OR'}/>
        <DnDFiles />
      </div>
  );
}