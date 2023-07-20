
import Client from './client.class.js';
const app = window.require('electron');
const {ipcRenderer} = app;
const fs = window.require('fs');
const path = window.require('path');

const maFilesPath = './maFiles';
const accountsFile = path.join(maFilesPath, 'accounts.json');
const settingsPath = path.join(maFilesPath, 'settings.json');

export const getMaFiles = (dir = maFilesPath) => {
    let accounts = [];

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        return accounts;
    }
 
    var allFiles = fs.readdirSync(dir);
    allFiles = allFiles.filter(file => file.includes('.maFile'));

    accounts = allFiles.map(file => {
        let data = fs.readFileSync(dir + '/' + file, 'utf8');
        data = JSON.parse(data);
        return {data, file};
    })

    return accounts;
};
export const saveAccount = (account, props = {}) => {
    let update = props.update;
    let steamId = props.steamId;
    let accounts = JSON.parse(fs.readFileSync(accountsFile, 'utf8'));
    let fAccount = accounts.find(acc => acc.account_name === account.account.account_name);
    
    if(!fAccount) accounts.push({account_name: account.account.account_name , maFilePath: account.account.maFilePath, password: account.account.password || "", display_name: account.account.display_name || "", proxy: account.account.proxy || "", auto_confirm_market: account.account.auto_confirm_market || false, auto_confirm_trades: account.account.auto_confirm_trades || false, guard: true});
    else {
        fAccount = {...fAccount, ...account.account, guard: true};
        accounts[accounts.findIndex((acc)=> acc.account_name === fAccount.account_name)] = fAccount;
    }
    
    if(account.account.guard && update) {
        let file_path = path.join(maFilesPath, account.account.maFilePath || `${steamId}.maFile`);
        fs.writeFileSync(file_path, JSON.stringify(account.account.guard, null, '\t'));
    }
    let saveAccountsFile = (data)=> fs.writeFileSync(accountsFile, JSON.stringify(data, null, '\t'));
    
    saveAccountsFile(accounts);
}
export const setSettings = (data) => {
    if(typeof data !== 'object') return;
    if (!fs.existsSync(settingsPath)) {
        fs.writeFileSync(settingsPath, JSON.stringify({
            bot_token: "",
            user_id: ""
        }));
    }
    let settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    fs.writeFileSync(settingsPath, JSON.stringify({...settings,...data}, null, '\t'));
    return;
}
export const getSettings = () => {
    if (!fs.existsSync(settingsPath)) {
        fs.writeFileSync(settingsPath, JSON.stringify({
            bot_token: ""
        }));
    }
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
}
export const removeAccount = (account_name) => {
    if (!fs.existsSync(accountsFile)) {
        fs.writeFileSync(accountsFile, JSON.stringify([]));
    }
    let data = fs.readFileSync(accountsFile, 'utf8');
    let accounts = JSON.parse(data);

    let acc = accounts.find(x=> x.account_name === account_name);
    if(acc) {
        accounts.splice(accounts.findIndex(x=> x.account_name === account_name), 1);
        fs.writeFileSync(accountsFile, JSON.stringify(accounts, null, '\t'));
    }
}
export const getAccounts = async () => {
    let accounts = [];
    if (!fs.existsSync(maFilesPath)) {
        fs.mkdirSync(maFilesPath);
    }
    if (!fs.existsSync(accountsFile)) {
        fs.writeFileSync(accountsFile, JSON.stringify([]));
    }
    else {
        let data = fs.readFileSync(accountsFile, 'utf8');
        accounts = JSON.parse(data);
    }
    accounts = accounts.map(x=> {
        x.guard = false;
        return x;
    });

    let maFiles = getMaFiles();
    maFiles.forEach(guard => {
        let acc = accounts.find(x=> x.account_name === guard.data.account_name);
        if(acc) acc.guard = true;
       
    });
    fs.writeFileSync(accountsFile, JSON.stringify(accounts, null, '\t'));

    accounts = accounts.map(x=> {
        let acc = maFiles.find(y=> y.file === x.maFileName);
        
        if(!acc) acc = maFiles.find(y=> y.data.account_name === x.account_name);
        if(acc && !acc.maFileName) acc.maFileName = acc.file;
        x.guard = acc?.data || false;
        x = new Client(x);
        ipcRenderer.send("load-account-confirmations", x.stringify());
        return x;
    })
   
    return accounts;
}

