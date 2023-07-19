const electron = require("electron");
const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, screen, dialog } = electron;
const path = require('path');
const Client = require('./src/steamUtils/client.class.cjs');
const {AddGuard, AddUser} = require('./src/steamUtils/steamGuard.class.cjs');
const Logger = require("./src/steamUtils/logger.class.cjs");
let isDev = !app.isPackaged || false;
let mainWindow;
let importWindow;
let steamGuardWindow;
let tray;
let notificationWindow;


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

if (!gotTheLock) {
  app.quit();
}
else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        }
      });
}
/*
autoUpdater.autoDownload = false;
autoUpdater.setFeedURL({
    url: 'https://github.com/themod161/themod-sda/releases',
    repo: "themod-sda",
    owner: "themod161",
    provider: 'github'
});

autoUpdater.on('update-available', () => {
    console.info('Update available.');
    new Logger('Update available', "log");
    dialog.showMessageBox(
        {
          type: 'question',
          buttons: ['Обновить', 'Отмена'],
          defaultId: 0,
          message: 'Доступно обновление. Хотите обновить приложение?'
        },
        (response) => {
          if (response === 0) {
            // Пользователь выбрал "Обновить"
            autoUpdater.downloadUpdate();
          }
        }
      );
    // Здесь вы можете показать уведомление пользователю о наличии обновления
  });
  autoUpdater.on('update-not-available', ()=> {
    new Logger('update not finded', "log");
  })
  autoUpdater.on('update-downloaded', () => {
    new Logger('Update downloaded', "log");
    console.info('Update downloaded; will install in 5 seconds');
    // Здесь вы можете показать уведомление о том, что обновление загружено и готово к установке.
    // После некоторой задержки запустите установку обновления:
    /*dialog.showMessageBox(
    {
      type: 'question',
      buttons: ['Установить и перезапустить', 'Позже'],
      defaultId: 0,
      message: 'Обновление загружено. Установить и перезапустить приложение?'
    },
    (response) => {
      if (response === 0) {
        // Пользователь выбрал "Установить и перезапустить"
        autoUpdater.quitAndInstall();
      }
    }
  );
    setTimeout(() => {
      //autoUpdater.quitAndInstall();
    }, 5000);
  });
*/
app.on("ready", ()=> {
    /*autoUpdater.checkForUpdatesAndNotify().then((value)=> {
        new Logger(JSON.stringify(value.updateInfo));
    }).catch((error)=> new Logger(error.message, 'error'));
    setInterval(() => {
        autoUpdater.checkForUpdatesAndNotify();
    }, 10 * 60 * 1000);*/
    
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
                tray.destroy();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
        if (mainWindow.isVisible()) mainWindow.hide();
        else mainWindow.show();
    });
    notificationWindow.loadURL((!isDev ? `${app.getAppPath()}\\build\\index.html#/notifications` : 'http://localhost:3000/notifications'));
    //test
    /*notificationWindow.webContents.on('did-finish-load', ()=> {
        notificationWindow.show();
        notificationWindow.setSkipTaskbar(false);
    })*/
    
    mainWindow.loadURL(!isDev ? `${app.getAppPath()}\\build\\index.html` : 'http://localhost:3000/');
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
    if(notificationWindow) notificationWindow.webContents.send("add-notification", {...data, windowFrom: event.sender.id});
});
ipcMain.on('toggle-guard', async (event, account) => {
    if(steamGuardWindow) return;
    account = await new Client().restore(JSON.parse(account));
    if(!account) {
        new Logger("{TOGGLE-GUARD} No account to restore", "error");
        return;
    }
    if(newGuardAccount) return;
    newGuardAccount = new AddGuard({
        app, BrowserWindow, ipcMain
    }, account.account.guard ? 'remove': 'add', account);
    try {
        newGuardAccount.loginAttempt((type)=> {
            newGuardAccount = undefined;
            mainWindow.webContents.send('need-load-accounts');
            mainWindow.focus();
            mainWindow.show();
            mainWindow.webContents.send('add-notify', `Steam Guard was successfully ${type}`, "success");
            new Logger(`(${account.account.account_name}) {TOOGLE-GUARD} Steam Guard was successfully ${type}`, "log");
        }, (e)=> {
            newGuardAccount = undefined;
            mainWindow.focus();
            mainWindow.show();
            mainWindow.webContents.send('add-notify', e.message, "error");
            new Logger(`(${account.account.account_name}) {TOOGLE-GUARD} ${e.message}`, "error");
        });
    } catch (e) {
        new Logger(`(${account.account.account_name}) ${e.message}`, "error");
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
ipcMain.on('update-account-by-username', async (event, account) => {
    let tempAccount = JSON.parse(account);
    mainWindow.webContents.send('update-account-by-username', account);
    let accountWindow = openedWindows.find(x=> x.account_name == tempAccount.account.account_name);
    if(accountWindow) {
        accountWindow.window.webContents.send('update-account-by-username', account);
        if(accountWindow.window.isVisible()) accountWindow.window.show();
        else accountWindow.window.hide();
        
    }
})
ipcMain.on('open-account-settings', async (event, account) => {
    account = await new Client().restore(JSON.parse(account));
    if(!account) {
        new Logger("{USER SETTINGS} No account to restore");
        return;
    }
    let accountWindow = openedSettingsWindows.find(x=> x.account_name == account.getAccountName());
    if(accountWindow && !accountWindow.window.isDestroyed()) {
        accountWindow.window.show();
        accountWindow.window.focus();
    }
    else {
        if(accountWindow?.window.isDestroyed()) {
            openedSettingsWindows.splice(openedSettingsWindows.findIndex(x=> x.account_name == account.getAccountName()), 1);
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
        BrWindow.loadURL(!isDev ? `${app.getAppPath()}\\build\\index.html#${'/settings'}` : 'http://localhost:3000/settings');
        BrWindow.webContents.on('did-finish-load', () => {
            BrWindow.setTitle(`${account.getAccountName()} - settings`);
            BrWindow.webContents.send('account-load', account.stringify());
            BrWindow.show();
            BrWindow.setSkipTaskbar(false);
        });
        
        BrWindow.focus();
        openedSettingsWindows.push({account_name: account.getAccountName(), window: BrWindow});
    }
})

let newGuardAccount;
ipcMain.on('remove-notification', (event, data) => {
    if(notificationWindow) notificationWindow.webContents.send('remove-notification', data);
})
ipcMain.on('load-account-confirmations', async (event, account) => {
    account = await new Client().restore(JSON.parse(account));
    if(!account) {
        new Logger("{USER CONFIRMATIONS} No account to restore");
        return;
    }
    let accountWindow = openedWindows.find(x=> x.account_name == account.getAccountName());
    if(accountWindow && !accountWindow.window.isDestroyed()) {
        if(accountWindow.window.isVisible()) {
            accountWindow.window.show();
            accountWindow.window.focus();
        }
        
    }
    else {
        if(accountWindow?.window.isDestroyed()) {
            openedWindows.splice(openedWindows.findIndex(x=> x.account_name == account.getAccountName()), 1);
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
        
        
        BrWindow.loadURL(!isDev ? `${app.getAppPath()}\\build\\index.html#${'/confirmations'}` : 'http://localhost:3000/confirmations');
        BrWindow.webContents.on('did-finish-load', () => {
            BrWindow.setTitle(`${account.getAccountName()} - confirmations`);
            BrWindow.webContents.send('account-load', account.stringify());
            new Logger(`${account.getAccountName()} - confirmations load`, "log");
        });
        openedWindows.push({account_name: account.getAccountName(), window: BrWindow});
    }
});
ipcMain.on('open-account-confirmations', async (event, account)=> {
    account = await new Client().restore(JSON.parse(account));
    let accountWindow = openedWindows.find(x=> x.account_name == account.getAccountName());
    accountWindow.window.show();
    accountWindow.window.focus();
    accountWindow.window.setSkipTaskbar(false);
});

ipcMain.on('minimize-window', (event) => {
    BrowserWindow.fromId(event.sender.id).minimize();
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
            mainWindow.webContents.send('need-load-accounts');
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
        mainWindow.webContents.send('need-load-accounts');
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
    importWindow.loadURL(!isDev ? `${app.getAppPath()}\\build\\index.html#${'/import'}` : 'http://localhost:3000/import');
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
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