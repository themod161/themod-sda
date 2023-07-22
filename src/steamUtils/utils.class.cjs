//const Client = require('./client.class.cjs'); 
const {app, ipcMain} = require('electron');

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
        return {data, file};
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
    fs.writeFileSync(settingsPath, JSON.stringify({...settings,...data}, null, '\t'));
    return;
}
const removeAccount = (account_name) => {
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
    let accounts = JSON.parse(fs.readFileSync(accountsFile, 'utf8'));
    let fAccount = accounts.find(acc => acc.account_name == account.account_name);
    
    if(!fAccount) accounts.push({account_name: account.account_name , maFileName: account.maFileName || `${steamId}.maFile`, avatar_url: account.avatar_url || "", password: account.password || "", display_name: account.display_name || "", position: accounts.length, proxy: account.proxy || "", guard: true});
    else {
        fAccount = {...fAccount, ...account, guard: !!account.guard};
        accounts[accounts.findIndex((acc)=> acc.account_name == fAccount.account_name)] = fAccount;
    }
    
    if(account.guard) {
        let file_path = path.join(maFilesPath, account.maFileName || `${steamId}.maFile`);
        fs.writeFileSync(file_path, JSON.stringify(account.guard, null, '\t'));
    }
    //console.log(accounts);
    let saveAccountsFile = (data)=> fs.writeFileSync(accountsFile, JSON.stringify(data, null, '\t'));
    
    saveAccountsFile(accounts);
}
const getAccounts = (clients = undefined) => {
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

    accounts = accounts.sort((a,b) => a.position - b.position).map(x=> {
        let acc = maFiles.find(y=> y.file === x.maFileName);
        
        if(!acc) acc = maFiles.find(y=> y.data.account_name === x.account_name);
        if(acc && !acc.maFileName) acc.maFileName = acc.file;
        x.guard = acc?.data || false;
        const Client = require('./client.class.cjs');
        x = new Client(x);
        let oldAcc = clients?.find(y=> y.account.account_name == x.account.account_name);
        if(oldAcc && oldAcc.loginStatus == 'logged') {
            oldAcc.account = x.account;
            return oldAcc;
        }
        if(x.account.auto_login) {
            x.login().then(()=> {
                ipcMain.emit('load-account-confirmations', x.getAccount());
            });
        }
        return x;
    })
   
    return accounts;
}
const getAccountByUsername = (username) => {
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
    let account = accounts.find(x=> x.account_name == username);
    if(!account) return false;
    account.guard = false;

    let maFiles = getMaFiles();
    let acc = maFiles.find(y=> y.file === account.maFileName);
        
    if(!acc) acc = maFiles.find(y=> y.data.account_name === account.account_name);
    if(acc && !acc.maFileName) acc.maFileName = acc.file;
    account.guard = acc?.data || false;
    const Client = require('./client.class.cjs');
    account = new Client(account);
    if(account.account.auto_login) {
        account.login().then(()=> {
            ipcMain.emit('load-account-confirmations', account.getAccount());
        });
    }
    return account;
}
const savePositions = (clients) => {
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
    //console.log(clients);
    clients.forEach((x,ind)=> {
        let acc = accounts.find(y => y.account_name == x.account_name);
        if(acc) acc.position = ind;
    })
    fs.writeFileSync(accountsFile, JSON.stringify(accounts, null, '\t'));
}
module.exports = {
    getMaFiles,
    getAccounts,
    saveAccount,
    getSettings,
    setSettings,
    removeAccount,
    savePositions,
    getAccountByUsername
}