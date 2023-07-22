const electron = require("electron");

const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, screen, dialog } = electron;
const path = require('path');
const Client = require('./src/steamUtils/client.class.cjs');

const {AddGuard, AddUser} = require('./src/steamUtils/steamGuard.class.cjs');
const Logger = require("./src/steamUtils/logger.class.cjs");
const { getSettings, getAccounts, removeAccount, setSettings, saveAccount, savePositions, getAccountByUsername } = require("./src/steamUtils/utils.class.cjs");
const TelegramBot = require("./src/steamUtils/telegramBot.class.cjs");
const { Proxy, parseProxy } = require("./src/steamUtils/proxy.class.cjs");
let settings = getSettings();
let accounts;


let isDev = !app.isPackaged || false;
let mainWindow;
let importWindow;
let steamGuardWindow;
let tray;
let notificationWindow;
let settingsWindow;
let bot;

let openedWindows = [];
let openedSettingsWindows = [];

let optionsForWindow = {
    minWidth: 400,
    minHeight: 600,
    width: 400,
    height: 600,
    transparent: true,
    resizable: true,
    frame: false,
    show: false,
    skipTaskbar: true,
    title: "themod-sda",
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        devTools: isDev
    }
}
const gotTheLock = app.requestSingleInstanceLock();
const generateWindowLink = (url, basePath = './build/index.html') => {
    return `${path.join(__dirname, basePath)}${url}`;
}
const loginToBot = () => {
    if(!settings.bot_token) return;
    try {
        if(bot) {
            bot.bot.stopPolling();
            bot = undefined;
        }
        bot = new TelegramBot(settings.bot_token, 
            (bot, message)=> {
                if(settings.user_id && message.from.id != settings.user_id) return;
                if(message.text == '/guard') {
                    if(!accounts) return bot.sendMessage(message.chat.id, `Accounts not loaded now`);
                    let a = accounts.filter(x=> !!x.account.guard).map(x=> ({display_name: x.getDisplayName() || x.getAccountName(), account_name: x.getAccountName()}));
                    let keyboard = {
                        reply_markup: {
                            inline_keyboard: []
                        }
                    }
                    if(a.length > 0) {
                        let res = [];
                        a.forEach((x,ind)=> {
                            if(ind%2 == 0) {
                                res.push([{text: x.display_name, callback_data: `getGuard_${x.account_name}`}]);
                            }
                            else res[Math.floor(ind/2)].push({text: x.display_name, callback_data: `getGuard_${x.account_name}`})
                        })
                        keyboard.reply_markup.inline_keyboard = res;
                    }
                    return bot.sendMessage(message.chat.id, `Choose account:`, keyboard);
                }
            }, 
            (bot, query) => {
                if(query.data.includes('back_to_')) {
                    let data = query.data.replace('back_to_', '');
                    if(data == 'guard') {
                        if(!accounts) return bot.editMessageText(`Accounts not loaded now`, {
                            reply_markup: {
                                inline_keyboard: [[{text: 'Refresh', callback_data: 'back_to_guard'}]]
                            },
                            "message_id": query.message.message_id,
                            "chat_id": query.message.chat.id
                        });
                        let a = accounts.filter(x=> !!x.account.guard).map(x=> ({display_name: x.getDisplayName() || x.getAccountName(), account_name: x.getAccountName()}));
                        let keyboard = {
                            reply_markup: {
                                inline_keyboard: []
                            }
                        }
                        if(a.length > 0) {
                            let res = [];
                            a.forEach((x,ind)=> {
                                if(ind%2 == 0) {
                                    res.push([{text: x.display_name, callback_data: `getGuard_${x.account_name}`}]);
                                }
                                else res[Math.floor(ind/2)].push({text: x.display_name, callback_data: `getGuard_${x.account_name}`})
                            })
                            keyboard.reply_markup.inline_keyboard = res;
                        }
                        return bot.editMessageText(`Choose account:`, {
                            "message_id": query.message.message_id,
                            "chat_id": query.message.chat.id,
                            reply_markup: keyboard.reply_markup
                        })
                    }
                }
                else if(query.data.includes('getGuard_')) {
                    let account_name = query.data.match(/getGuard_(?<account_name>.*)/i).groups.account_name;
                    let acc = accounts.find(x=> x.getAccountName() == account_name);
                    if(!acc) return bot.editMessageText(`Account not fonded`, {
                        reply_markup: {
                            inline_keyboard: [[{text: 'Back', callback_data: 'back_to_guard'}]]
                        },
                        "message_id": query.message.message_id,
                        "chat_id": query.message.chat.id
                    })
                    
                    return bot.editMessageText(`Guard: ${acc.getGuardCode() || `Steam guard not install or not added`}`, {
                        reply_markup: {
                            inline_keyboard: [[{text: 'Back', callback_data: 'back_to_guard'}]]
                        },
                        "message_id": query.message.message_id,
                        "chat_id": query.message.chat.id
                    });
                }
                else if(query.data.match(/\((?<username>.*)\)_(?<id>[0-9]+)_(?<response>.*)/mi))
                {
                    let confirm_data = query.data.match(/\((?<username>.*)\)_(?<id>[0-9]+)_(?<response>.*)/mi);
                    let {username, id, response} = confirm_data.groups;
                    
                    let accWindow = openedWindows.find(x=> x.account_name == username);
                    if(accWindow) {

                        accWindow.window.webContents.send('data-notification', {
                            id,
                            data: response
                        })
                    }
                    bot.bot.deleteMessage(query.message.chat.id, query.message.message_id);
                }
                
            }
        );
        if(settings.user_id) {
            bot.sendMessage(settings.user_id, "I'm here");
        }
    } catch (error) {
        new Logger(`{TGBOT} ${error.message}`, "error");
    }
}

if (!gotTheLock) {
    if(bot) bot.bot.stopPolling();
    app.quit();
}
else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        }
    });
    loginToBot();
}
app.on("ready", ()=> {
    if (process.platform === 'win32') app.setAppUserModelId('com.themod.themod-sda');
    
    mainWindow = new BrowserWindow(optionsForWindow);
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    notificationWindow = new BrowserWindow({
        ...optionsForWindow,
        minWidth: undefined,
        minHeight: undefined,
        width: 380,
        height: 320,
        x: width - 380,
        resizable: false,
        movable: false,
        y: height-320,
        alwaysOnTop: true
    })
    
    tray = new Tray(path.join(__dirname, 'src', 'img', 'logo.png'));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open App',
            click: () => mainWindow.show()
        },
        {
            label: 'Quit',
            click: () => {
                app.quit();
                if(bot) bot.bot.stopPolling();
                tray.destroy();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
        if (mainWindow.isVisible()) mainWindow.hide();
        else mainWindow.show();
    });
    notificationWindow.loadURL((!isDev ? generateWindowLink(`#/notifications`) : 'http://localhost:3000/notifications'));
    mainWindow.loadURL(!isDev ? generateWindowLink(``) : `http://localhost:3000`);
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.show();
        mainWindow.setSkipTaskbar(false);
    });
})

ipcMain.on('data-notification', (event,data) => {
    if(!data.windowFrom) return;
    let wn = BrowserWindow.fromId(data.windowFrom);
    if(wn) wn.webContents.send('data-notification', data);
})

ipcMain.on('add-notification', (event,data)=> {
    if(notificationWindow) {
        notificationWindow.webContents.send("add-notification", {...data, windowFrom: event.sender.id});
        if(bot && settings.user_id && data.type != 'input') {
            let keyboard = {
                reply_markup: {
                    inline_keyboard: []
                }
            };
            if(data.actions) {
                keyboard.reply_markup.inline_keyboard = [data.actions.map(x=> ({"text": `${x.data.charAt(0).toUpperCase() + x.data.slice(1)}`, "callback_data": `(${data.account_name})_${data.id}_${x.data}`}))];
            }
            bot.sendMessage(settings.user_id, `Account: ${data.title}\n\nMessage: ${data.message}`, keyboard);
        }
    }
});

ipcMain.handle('getAppVersion', ()=> {
    return app.getVersion();
})


ipcMain.on('toggle-guard', async (event, account) => {
    if(steamGuardWindow) return;
    if(!account) {
        new Logger("{TOGGLE-GUARD} No account to restore", "error");
        return;
    }
    if(newGuardAccount) return;
    newGuardAccount = new AddGuard({
        app, BrowserWindow, ipcMain, notificationWindow
    }, account.guard ? 'remove': 'add', account);
    try {
        newGuardAccount.loginAttempt((type)=> {
            newGuardAccount = undefined;
            mainWindow.webContents.send('update-account-by-username', account);
            mainWindow.focus();
            mainWindow.show();
            mainWindow.webContents.send('add-notify', `Steam Guard was successfully ${type}`, "success");
            new Logger(`(${account.account_name}) {TOOGLE-GUARD} Steam Guard was successfully ${type}`, "log");
        }, (e)=> {
            newGuardAccount = undefined;
            mainWindow.focus();
            mainWindow.show();
            mainWindow.webContents.send('add-notify', e.message, "error");
            new Logger(`(${account.account_name}) {TOOGLE-GUARD} ${e.message}`, "error");
        });
    } catch (e) {
        new Logger(`(${account.account_name}) ${e.message}`, "error");
        mainWindow.webContents.send('add-notify', e.message, "error");
        mainWindow.focus();
        mainWindow.show();
    }
})
ipcMain.on('show-window', (event, id, itemId) => {
    let wn = BrowserWindow.fromId(id || event.sender.id);

    if(wn) {
        wn.show();
        wn.focus();
        wn.setSkipTaskbar(false);
        if(itemId) {
            wn.webContents.executeJavaScript(`
                document.querySelector('.confirmations-list #conf${itemId}')
                ? document.querySelector('.confirmations-list').querySelector('#conf${itemId}').scrollIntoView({ behavior: 'smooth' }) 
                :   ""
            `);
        }
        
    }
})
ipcMain.on('hide-window', (event, account) => {
    let wn = BrowserWindow.fromId(event.sender.id);
    if(wn){
        wn.setSkipTaskbar(true);
        wn.hide();
    } 
})

ipcMain.handle('check-proxy', (event,proxy)=> {
    proxy = new Proxy(parseProxy(proxy));
    return proxy.testProxy();
});

ipcMain.on('update-account-by-username', async (event, account) => {
    saveAccount(account);
    mainWindow.webContents.send('update-account-by-username', account);
    let accountWindow = openedWindows.find(x=> x.account_name == account.account_name);
    if(accountWindow) accountWindow.window.webContents.send('update-account-by-username', account);
    let acc = accounts.find(x=> x.getAccountName() == account.account_name);
    if(acc) {
        if(acc.account.proxy != account.proxy)  {
            acc = new Client(account);
            console.log(acc);
            await acc.login();
        }
        else acc.account = account;
    }
    
    
});
ipcMain.on('update-app-settings', async (event, settings_data) => {
    setSettings(settings_data);
    let newSettings = getSettings();
    if(newSettings.bot_token != settings.bot_token) {
        settings = newSettings;
        if(newSettings.bot_token) {
            loginToBot();
        }
        else if(bot) {
            bot.bot.stopPolling();
            bot = undefined;
        }
    }
    settings = newSettings;
})
ipcMain.on('open-settings', async (event) => {
    if (settingsWindow) return;
    settingsWindow = new BrowserWindow(optionsForWindow);
    settingsWindow.loadURL(!isDev ? generateWindowLink('#/appsettings') : 'http://localhost:3000/appsettings');
    settingsWindow.webContents.on('did-finish-load', () => {
        settingsWindow.setTitle(`themod-sda - settings`);
        settingsWindow.webContents.send('settings-load', settings);
        settingsWindow.show();
        settingsWindow.setSkipTaskbar(false);
    });
})
ipcMain.on('open-account-settings', async (event, account) => {
    if(!account) {
        new Logger("{USER SETTINGS} No account to restore");
        return;
    }
    let accountWindow = openedSettingsWindows.find(x=> account.account_name == x.account_name);
    if(accountWindow && !accountWindow.window.isDestroyed()) {
        accountWindow.window.show();
        accountWindow.window.focus();
    }
    else {
        if(accountWindow?.window.isDestroyed()) {
            openedSettingsWindows.splice(openedSettingsWindows.findIndex(x=> account.account_name == x.account_name), 1);
            accountWindow = undefined;
        }
        let BrWindow = new BrowserWindow({
            width: 400,
            height: 600,
            minWidth: 400,
            minHeight: 600,
            transparent: true,
            resizable: true,
            frame: false,
            show: false,
            skipTaskbar: true,
            webPreferences: {
                nodeIntegration: true,
                enableRemoteModule: true,
                contextIsolation: false,
                devTools: isDev
            }
        });
        
        BrWindow.loadURL(!isDev ? generateWindowLink('#/settings') : 'http://localhost:3000/settings');
        BrWindow.webContents.on('did-finish-load', () => {
            BrWindow.setTitle(`${account.account_name} - settings`);
            BrWindow.webContents.send('account-load', account);
            BrWindow.show();
            BrWindow.setSkipTaskbar(false);
        });
        
        BrWindow.focus();
        openedSettingsWindows.push({account_name: account.account_name, window: BrWindow});
    }
})

let newGuardAccount;
ipcMain.on('remove-notification', (event, data) => {
    if(notificationWindow) notificationWindow.webContents.send('remove-notification', data);
})
let loadAccountConfirmations = (account) => {
    if(!account) {
        new Logger("{USER CONFIRMATIONS} No account to restore");
        return;
    }
    let accountWindow = openedWindows.find(x=> x.account_name == account.account_name);
    if(accountWindow && !accountWindow.window.isDestroyed()) {
        if(accountWindow.window.isVisible()) {
            accountWindow.window.show();
            accountWindow.window.focus();
        }
        
    }
    else {
        if(accountWindow?.window.isDestroyed()) {
            openedWindows.splice(openedWindows.findIndex(x=> x.account_name == account.account_name), 1);
            accountWindow = undefined;
        }
        let BrWindow = new BrowserWindow({
            width: 444,
            height: 600,
            minWidth: 444,
            minHeight: 600,
            transparent: true,
            resizable: true,
            frame: false,
            skipTaskbar: true,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                enableRemoteModule: true,
                contextIsolation: false,
                devTools: isDev
            }
        });
        
        BrWindow.loadURL(!isDev ? generateWindowLink('#/confirmations') : 'http://localhost:3000/confirmations');
        BrWindow.webContents.on('did-finish-load', () => {
            BrWindow.setTitle(`${account.account_name} - confirmations`);
            BrWindow.webContents.send('account-load', account);
            new Logger(`${account.account_name} - confirmations load`, "log");
        });
        openedWindows.push({account_name: account.account_name, window: BrWindow});
    }
}
ipcMain.on('load-account-confirmations', async (account) => {
    loadAccountConfirmations(account);
});
ipcMain.on('open-account-confirmations', async (event, account)=> {
    let accountWindow = openedWindows.find(x=> account.account_name == x.account_name);
    if(!accountWindow) {
        let acc = accounts.find(x=> x.getAccountName() == account.account_name);
        if(!acc) return;
        if(acc.loginStatus == 'none') await acc.login().catch((err)=> {
            new Logger(`{TRYTOLOGIN} ${account.account_name} ${err}`, "error");
        });
        console.log(acc);
        loadAccountConfirmations(account);
        accountWindow = openedWindows.find(x=> account.account_name == x.account_name);
        accountWindow.window.show();
        accountWindow.window.focus();
        accountWindow.window.setSkipTaskbar(false);
    }
    else {
        accountWindow.window.show();
        accountWindow.window.focus();
        accountWindow.window.setSkipTaskbar(false);
    }
});

ipcMain.on('minimize-window', (event) => {
    let wn = BrowserWindow.fromId(event.sender.id);
    if(wn) wn.minimize();
});
ipcMain.on('close-window', (event) => {
    if(openedSettingsWindows.find(x=> x.window.id == event.sender.id)) {
        openedSettingsWindows.find(x=> x.window.id == event.sender.id).window.close();
        openedSettingsWindows.splice(openedSettingsWindows.findIndex(x=> x.window.id == event.sender.id), 1);
        return;
    }
    if(openedWindows.find(x=> x.window.id == event.sender.id)) {
        let openedWindow = openedWindows.find(x=> x.window.id == event.sender.id).window;
        openedWindow.hide();
        openedWindow.setSkipTaskbar(true);
        return;
    }
    if(event.sender.id !== mainWindow.id) {
        if(!BrowserWindow.fromId(event.sender.id)) return event.sender.close();
        BrowserWindow.fromId(event.sender.id).close();
        if(settingsWindow && event.sender.id === settingsWindow.id) settingsWindow = undefined;
        if(importWindow && event.sender.id === importWindow.id) importWindow = undefined;
        if(steamGuardWindow && event.sender.id === steamGuardWindow.id) steamGuardWindow = undefined;
    }
    else BrowserWindow.fromId(event.sender.id).hide();
});
let newAddUser;
ipcMain.on('need-load-accounts', ()=> {
    mainWindow.webContents.send('need-load-accounts');
});
ipcMain.on('try-add-accounts-by-file', (event, files)=> {
    files = files.map(x=> JSON.parse(x));
    let accounts = files.map(x=> ({
        account_name: x.account_name,
        guard: x
    }));
    accounts.map(account=> {
        let t = new AddUser({
            app, BrowserWindow, ipcMain, notificationWindow
        }, account);
        t.loginAttempt(()=> {
            t = undefined;
            mainWindow.show();
            mainWindow.focus();
            new Logger(`Account ${account.account_name} was successfully added`, "log");
            mainWindow.webContents.send('add-notify', `Account ${account.account_name} was successfully added`, "success");
            let account = getAccountByUsername(account.account_name);
            accounts.push(account);
            mainWindow.webContents.send('update-account-by-username', account.getAccount());
            if(importWindow) {
                importWindow.destroy();
                importWindow = undefined;
            }
        }, (error)=> {
            t = undefined;
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('add-notify', error.message, "error");
            new Logger(error.message, "error");
            if(importWindow) {
                importWindow.destroy();
                importWindow = undefined;
            }
        })
    });
});
ipcMain.on('try-add-account', (event, account) => {
    if(newAddUser) return;
    newAddUser = new AddUser({
        app, BrowserWindow, ipcMain, notificationWindow
    }, account);
    newAddUser.loginAttempt(()=> {
        newAddUser = undefined;
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('add-notify', `Account was successfully added`, "success");
        let account = getAccountByUsername(account.account_name);
        accounts.push(account);
        mainWindow.webContents.send('update-account-by-username', account.getAccount());
        if(importWindow) {
            importWindow.destroy();
            importWindow = undefined;
        }
    }, (error)=> {
        newAddUser = undefined;
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('add-notify', error.message, "error");
        if(importWindow) {
            importWindow.destroy();
            importWindow = undefined;
        }
    })
})
ipcMain.on('import-account', async (event)=> {
    
    if(importWindow) return;
    importWindow = new BrowserWindow({
        minWidth: 400,
        minHeight: 600,
        width: 400,
        height: 600,
        transparent: true,
        resizable: true,
        frame: false,
        show: false,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false,
            devTools: isDev
        }
    });
    importWindow.once('ready-to-show', () => {
        importWindow.show();
        importWindow.setSkipTaskbar(false);
    });
    
    importWindow.loadURL(!isDev ? generateWindowLink('#/import') : 'http://localhost:3000/import');
})

//ACCOUNTS LOGIC
ipcMain.on('re-login', async (event, account) => {
    let acc = accounts.find(x=> x.getAccountName() == account.account_name);
    if(acc) {
        acc = undefined;
        console.log('relogin');
        acc = getAccountByUsername(account.account_name);
    }
});
ipcMain.handle('get-accounts', () => {
    accounts = getAccounts(accounts);
    return accounts.map(acc=> acc.getAccount());
})
ipcMain.on('remove-account', (event, username) => {
    let acc = accounts.find(x=> x.getAccountName() == username);
    if(acc) acc = undefined;
    removeAccount(username);
})
ipcMain.on('logger', (event, text, type) => {
    new Logger(text, type);
});

ipcMain.on('new-offer', (data) => {
    let accountWindow = openedWindows.find(x=> data.account_name == x.account_name);
    if(!accountWindow) return;
    accountWindow.window.webContents.send('new-offer', data.newOffer);
});
ipcMain.handle('get-confirmations-list', async (event, account_name) => {
    let acc = accounts.find(x=> x.getAccountName() == account_name);
    if(acc) {
        return await acc.getConfirmationList();
    }
    return {error: 'No account'};
})
ipcMain.handle('get-offers-list', async (event, account_name) => {
    let acc = accounts.find(x=> x.getAccountName() == account_name);
    if(acc) {
        return await acc.getOffersList();
    }
    return {error: 'No account'};
})
ipcMain.handle('get-trade-info', async(event, {account_name, offerId}) => {
    let acc = accounts.find(x=> x.getAccountName() == account_name);
    if(acc) return await acc.getTradeInfo(offerId);
});

ipcMain.handle('answer-to-confirmation', async(event, account_name, id, key, value) => {
    let acc = accounts.find(x=> x.getAccountName() == account_name);
    if(acc) return await acc.answerToConfirmation(id, key, value);
})
ipcMain.handle('answer-to-offer', async (event, account_name, offer, value)=> {
    let acc = accounts.find(x=> x.getAccountName() == account_name);
    if(acc) return await acc.answerOffer(offer, value);
})

ipcMain.handle('save-position', (event, accountList) => {
    savePositions(accountList);
})
///




app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
    if(bot) bot.bot.stopPolling();
});
app.on('quit', ()=> {
    tray.destroy();
})
app.on('activate', () => {

    if (BrowserWindow.getAllWindows().length === 0) {
        globalShortcut.unregister('CommandOrControl+R');
        globalShortcut.unregister('F5');
        globalShortcut.unregister('Control+Shift+R');
        createWindow();
    }
});