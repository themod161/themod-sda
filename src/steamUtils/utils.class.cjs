const Client = require('./client.class.cjs'); 
const {app} = require('electron');

const fs = require('fs');
const path = require('path');

const maFilesPath = './maFiles';
const accountsFile = path.join(maFilesPath, 'accounts.json');
const settingsPath = path.join(maFilesPath, 'settings.json');

const getMaFiles = (dir = maFilesPath) => {
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
        data.maFileName = file;
        return data;
    })

    return accounts;
};
const setSettings = (data) => {
    if(typeof data !== 'object') return;
    if (!fs.existsSync(maFilesPath)) {
        fs.mkdirSync(maFilesPath);
    }
    if (!fs.existsSync(settingsPath)) {
        fs.writeFileSync(settingsPath, JSON.stringify({
            bot_token: ""
        }));
    }
    let settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    fs.writeFileSync(accountsFile, JSON.stringify({...settings,...data}, null, '\t'));
    return;
}
const getSettings = () => {
    if (!fs.existsSync(maFilesPath)) {
        fs.mkdirSync(maFilesPath);
    }
    if (!fs.existsSync(settingsPath)) {
        fs.writeFileSync(settingsPath, JSON.stringify({
            bot_token: ""
        }));
    }
    
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
}
const saveAccount = (account, ...props) => {
    let {steamId} = props;
    if(!account.account) account.account = account;
    let accounts = JSON.parse(fs.readFileSync(accountsFile, 'utf8'));
    let fAccount = accounts.find(acc => acc.account_name == account.account.account_name);
    
    if(!fAccount) accounts.push({account_name: account.account.account_name , maFileName: account.account.maFileName || `${steamId}.maFile`, password: account.account.password || "", display_name: account.account.display_name || "", proxy: account.account.proxy || "", guard: true});
    else {
        fAccount = {...fAccount, account_name: account.account.account_name, password: account.account.password, display_name: account.account.display_name || "", proxy: account.account.proxy || "", guard: true, maFileName: account.account.maFileName || `${steamId}.maFile`};
        accounts[accounts.findIndex((acc)=> acc.account_name == fAccount.account_name)] = fAccount;
    }
    
    if(account.guard) {
        let file_path = path.join(maFilesPath, account.account.maFileName || `${steamId}.maFile`);
        fs.writeFileSync(file_path, JSON.stringify(account.guard, null, '\t'));
    }
    let saveAccountsFile = (data)=> fs.writeFileSync(accountsFile, JSON.stringify(data, null, '\t'));
    
    saveAccountsFile(accounts);
}
const getAccounts = async () => {
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
        let acc = accounts.find(x=> x.account_name == guard.account_name);
        if(acc) acc.guard = true;
        else accounts.push({account_name: guard.account_name, password: undefined, proxy: "", guard: true});
    });
    fs.writeFileSync(accountsFile, JSON.stringify(accounts, null, '\t'));

    accounts = accounts.map(x=> {
        let acc = maFiles.find(y=> y.account_name == x.account_name);
        
        x.guard = acc || false;
        x = new Client(x)
        return x;
    })
   
    return accounts;
}

module.exports = {
    getMaFiles,
    getAccounts,
    saveAccount,
    getSettings,
    setSettings
}