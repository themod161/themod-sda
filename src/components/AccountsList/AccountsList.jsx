import './AccountsList.css';
import Account from './Account';
import { useContext, useEffect, useState, useRef } from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import AccountsContext from '../../contexts/AccountsContext';
const { ipcRenderer } = window.require('electron');

export default function AccountsList() {
    let {accounts, setAccounts} = useContext(AccountsContext);
    let [accountsList, setAccountsList] = useState([]);
    let [searchName, setSearchName] = useState("");
    const dragItem = useRef();
    const dragOverItem = useRef();
    const [isDragOver, setIsDragOver] = useState(false);
    const dragStart = (e, position) => {
        dragItem.current = position;
    };
    const dragEnter = (e, position) => {
        dragOverItem.current = position;
        setIsDragOver(position);
    };
    const drop = (e) => {
        dragItem.current -= 1;
        dragOverItem.current -= 1;
        const copyListItems = [...accountsList];
        const dragItemContent = copyListItems[dragItem.current];
        copyListItems.splice(dragItem.current, 1);
        copyListItems.splice(dragOverItem.current, 0, dragItemContent);
        ipcRenderer.invoke('save-position', copyListItems);
        dragItem.current = null;
        dragOverItem.current = null;
        setAccountsList(copyListItems);
        setIsDragOver(false);
    };
    useEffect(()=> {
        let aaa = accounts.filter(x=>  x?.account_name?.includes(searchName));
        setAccountsList(aaa);
    }, [accounts, searchName]);
    useEffect(() => {
        const updateAccountHandler = async (event, account) => {
          let newAccounts = JSON.parse(JSON.stringify(accounts));
          let ind = newAccounts.findIndex((x) => x.account_name === account.account_name);
          if(ind == -1) {
            setAccounts(prev=> [...prev, account]);
          }
          newAccounts[ind] = account;
          setAccounts(newAccounts); // Update the accounts state with the modified array
        };
    
        ipcRenderer.on('update-account-by-username', updateAccountHandler);
    
        return () => {
          ipcRenderer.off('update-account-by-username', updateAccountHandler);
        };
      }, [accounts]);


    const handleOnInput = (e)=> {
        setSearchName(e.target.value);
    }

    return <section className="accounts-list-inner nDragble">
        <div className='accounts-search nDragble'>
            <input onInput={handleOnInput} placeholder='Search'/>
        </div>
        <div className="accounts-list">
            
                {accountsList.map((account, index)=> <Account key={account.account_name} dragItem={dragItem} isDragOver={isDragOver} dragStart={dragStart} dragEnter={dragEnter} drop={drop} account={account} index={index+1}/>)}
        </div>
    </section>
}