const {Proxy, parseProxy} = require("./proxy.class.cjs")
const SteamCommunity = require('steamcommunity');
const SteamSession = require('steam-session');
const SteamTotp = require('steam-totp');
const SteamStore = require('steamstore');
const ReadLine = require('readline');
const FS = require('fs');
const SteamUser = require('steam-user');
const path = require('path');
const { saveAccount } = require('./utils.class.cjs');
const Logger = require('./logger.class.cjs');
const EResult = SteamCommunity.EResult;

function generateUniqueId() {
    const timestamp = new Date().getTime();
    const randomNum = Math.random().toString(36).slice(2); // Generates a random string
    return `${timestamp}_${randomNum}`;
}

class AddGuard {
    constructor(electron, type, account, proxy={}) {
        this.electron = {
            app: electron.app, BrowserWindow: electron.BrowserWindow, ipcMain: electron.ipcMain, notificationWindow: electron.notificationWindow
        };
        this.type = type;
        this.account = account;
        this.proxy = proxy;
        this.callback = () => {};
        this.password = this.account.password;
        this.session = new SteamSession.LoginSession(SteamSession.EAuthTokenPlatformType.MobileApp);
        this.community = new SteamCommunity();
        this.cookies = [];
    }
    async loginAttempt(callback = ()=> {}, onError=()=> {}) {
        this.callback = callback;
        this.onError = onError;
        
        try {
            let login = this.account.account.account_name || await this.waitForInput('Write login:');
            this.password = this.account.account.password || await this.waitForInput('Write password:');
            let password = this.password;
            if(this.account.account.proxy?.constructor?.name == "Proxy") {
                let proxyObject = this.account.account.proxy;
                let options = {};
                if(proxyObject.isSocks()) options = {socksProxy: this.account.account.proxy.getProxyUrl()}
                else options = {httpProxy: this.account.account.proxy.getProxyUrl()};
                this.session = new SteamSession.LoginSession(SteamSession.EAuthTokenPlatformType.MobileApp, options);
            }

            this.session.on('authenticated', async () => {
                let accessToken = this.session.accessToken;
                let cookies = await this.session.getWebCookies();
                
                this.cookies = cookies;
                this.account.password = this.password;
                this.community.setCookies(cookies);
                this.community.setMobileAppAccessToken(accessToken);
                if(this.type == 'add') this.doSetup();
                else this.removeGuard();
            });
            this.session.on('timeout', () => {
                this.onError(new Error('This login attempt has timed out.'));
                
            });
            this.session.on('error', (err) => {
                this.onError(err);
                
            });
            let startResult = await this.session.startWithCredentials({accountName: login, password: password});
            this.actionRequired = startResult.actionRequired;
            if (startResult.actionRequired) {
                let codeActionTypes = [SteamSession.EAuthSessionGuardType.EmailCode, SteamSession.EAuthSessionGuardType.DeviceCode];
                let codeAction = startResult.validActions.find(action => codeActionTypes.includes(action.type));
                let text = ``;
                if (codeAction) {
                    if (codeAction.type == SteamSession.EAuthSessionGuardType.EmailCode) {
                        text = `Email code:`;
                    } else {
                        text = `Steam Guard Code:`;
                    }
                }
                new Logger(`(${this.account.account_name}) ${codeAction}`, "log");
                let code = await this.waitForInput(text);
                if (code) {
                    await this.session.submitSteamGuardCode(code);
                }
            }
        } catch(e) {
            
            new Logger(`(${this.account.account_name}) {ADDGUARD LOGIN} ${e.message}`, "error");
            this.onError(e);
        }
        
    }
    async removeGuard() {
        let rCode = await this.waitForInput('Revocation Code: (R00000)');
        rCode = rCode.replace('R', '');
        this.community.disableTwoFactor('R' + rCode, (err) => {
            if (err) {
                new Logger(`(${this.account.account.account_name}) ${err.message}`, "error");
                return;
            }
            
            new Logger(`(${this.account.account.account_name}) Two-factor authentication disabled!`, "log");
            try {
                let file_path = path.join(__dirname, '../../maFiles', this.account.account.maFileName||`${this.session.steamID.getSteamID64()}.maFile`);
                if(FS.existsSync(file_path)) FS.unlinkSync(file_path);
            } catch (error) {

                new Logger(error.message, "error");
            }
            
            this.callback("disabled");
        });
    }
    async doSetup() {
        try {
            await new Promise((resolve, reject) => {

                this.community.enableTwoFactor(async (err, response) => {
                    if (err) {
                        if (err.eresult == EResult.Fail) {
                            if(!this.actionRequired) {
                                let client = new SteamUser();
                                await new Promise((resolve) => {
                                    client.logOn({
                                        "accountName": this.account.account.account_name,
                                        "password": this.password
                                    })
                                    client.on('loggedOn', function(details) {
                                        resolve();
                                    });
                                })
                                if(!client.emailInfo.validated) {
                                    client.requestValidationEmail((err)=> {
                                        if(err) reject(err);
                                    });
                                    await this.waitForAccept("Confirm your email.");
                                }
                            }
                            let phone_number = await this.waitForInput("Write your phone number:");
                            let steamStore = new SteamStore();
                            steamStore.setCookies(await this.session.getWebCookies());

                            await new Promise(async (resolve,reject) => {
                                let res = await new Promise((resolve, reject) => {
                                    steamStore.addPhoneNumber(phone_number, true, async (err) => {

                                        if(err) reject(err);
                                        await this.waitForAccept("Confirm adding phone on email.")
                                        resolve();
                                    })
                                });
                                if(!res) {
                                    steamStore.sendPhoneNumberVerificationMessage((err)=> {
                                        if(err) reject(err);
                                    })
                                    let code = await this.waitForInput("Write code from your phone:");
                                    steamStore.verifyPhoneNumber(code, (err)=> {
                                        if(err) reject(err);
                                        else resolve();
                                    })
                                }
                                
                            })
                            return doSetup();
                        }
                        if(err.eresult == EResult.AccountLogonDeniedVerifiedEmailRequired) {
                            
                        }
                        if (err.eresult == EResult.RateLimitExceeded) {
                            
                            reject( Error("RateLimitExceeded. Try again later."));
                            return;
                        }
                        throw Error(err.message)
                        return;
                    }
            
                    if (response.status != EResult.OK) {
                        
                        reject(Error(`Status ${response.status}`));
                        return;
                    }
            
                    let filename = `${this.community.steamID.getSteamID64()}.maFile`;
                    
                    
                    response.device_id = SteamTotp.getDeviceID(this.community.steamID.getSteamID64());
                    response.Session = {};
                    this.cookies.forEach(cookie=> {
                        let key = cookie.split('=')[0];
                        let value = cookie.split('=')[1];
                        key = key.charAt(0).toUpperCase() + key.slice(1);
                        response.Session[key] = value;
                    });
                    response.Session.SteamID = this.community.steamID.getSteamID64();
                    
                    FS.writeFileSync(path.join(__dirname, '../../maFiles', filename), JSON.stringify(response, null, '\t'));
                    this.account.maFileName = filename;
                    this.account.password = this.password;
                    this.account.account_name = this.account.getAccountName();
                    saveAccount(this.account, {steamId: this.community.steamID.getSteamID64()})
                    await this.promptActivationCode(response);
                    resolve();
                });
            })
        } catch (err) {
            new Logger(`(${this.account.account_name}) {ADDGUARD DOSETUP} ${err.message}`, "error");
            this.onError(err);
        }
    }
    async promptActivationCode(response) {
        if (response.phone_number_hint) {
            
            new Logger(`(${this.account.account_name}) A code has been sent to your phone ending in ${response.phone_number_hint}.`, "log");
        }
        try {
            let smsCode = await this.waitForInput('SMS Code: ');
            await new Promise((resolve, reject) => {
                this.community.finalizeTwoFactor(response.shared_secret, smsCode, (err) => {
                    if (err) {
                        if (err.message == 'Invalid activation code') {
                            
                            promptActivationCode(response);
                            return;
                        }
                        return reject(err);
                        
                    } else {
                        
                        new Logger(`(${this.account.account_name}) Two-factor authentication enabled!`, "log");
                        this.callback("enabled");
                        resolve();
                        
                    }
                });
            })
        } catch (error) {
            this.onError(error);
            new Logger(`(${this.account.account_name}) {ACTIVESMS} ${error.message}`, "error");
        }
        
        
    }
    async waitForAccept(text) {
        return new Promise((resolve,reject) => {
            let id = generateUniqueId();
            this.electron.notificationWindow.webContents.send("add-notification", {
                id: id,
                icon: `logo.ico`,
                title: `${this.account.account.account_name}`,
                withoutTimer: true,
                message: text,
                actions: [{data: 'accept', icon: 'check'}]
            });
            this.electron.ipcMain.on('data-notification', (event,data) => {
                if(data.id != id) return;
                if(data.data == 'accept') resolve(data.value);
                else {
                    this.session.cancelLoginAttempt();
                    reject(new Error("You closed the window"));
                }
            })
        });
    }
    async waitForInput(text) {
        return new Promise((resolve,reject) => {
            /*
            let WFIWindow = new this.electron.BrowserWindow({
                width: 400,
                height: 250,
                minWidth: 400,
                minHeight: 250,
                transparent: true,
                frame: false,
                show: false,
                skipTaskbar: true,
                webPreferences: {
                    nodeIntegration: true,
                    enableRemoteModule: true,
                    contextIsolation: false,
                    devTools: false
                }
            })
            WFIWindow.loadURL(this.electron.app.isPackaged ? `${this.electron.app.getAppPath()}\\build\\index.html#${'/needInput'}` : 'http://localhost:3000/needInput');
            WFIWindow.webContents.on('did-finish-load', () => {
                WFIWindow.setTitle(`SteamGuard adding`);
                WFIWindow.webContents.send('wait-for-input', text);
                WFIWindow.show();
                WFIWindow.setSkipTaskbar(false);
            });
            this.electron.ipcMain.on('response-wait-for-input', (event, value) => {
                if(event.sender.id != WFIWindow.id) return;
                WFIWindow.destroy();
                resolve(value);
            });
            this.electron.ipcMain.on('close-window', (event) => {
                if(event.sender.id != WFIWindow.id) return;
                this.session.cancelLoginAttempt();
                reject(new Error("You closed the window"));
            })*/
            let id = generateUniqueId();
            this.electron.notificationWindow.webContents.send("add-notification", {
                id: id,
                icon: `logo.ico`,
                title: `${this.account.account.account_name}`,
                type: 'input',
                message: text,
                actions: []
            });
            this.electron.ipcMain.on('data-notification', (event,data) => {
                if(data.id != id) return;
                if(data.data == 'send') resolve(data.value);
                else {
                    this.session.cancelLoginAttempt();
                    reject(new Error("You closed the window"));
                }
            })
        });
    }
}

class AddUser {
    constructor(electron, account) {
        this.electron = electron;
        this.account = account;
        this.callback = () => {};
        this.session = new SteamSession.LoginSession(SteamSession.EAuthTokenPlatformType.MobileApp);
        this.community = new SteamCommunity();
        this.cookies = [];
    }
    async loginAttempt(callback = ()=> {}, onError=()=> {}) {
        this.callback = callback;
        this.onError = onError;
        
        try {
            this.account.proxy = this.account.proxy && parseProxy(this.account.proxy) ? new Proxy(parseProxy(this.account.proxy)) : "";
            let login = this.account.account_name || await this.waitForInput('Write login:');
            this.password = this.account.password || await this.waitForInput(`Write password (${this.account.account_name}): `);
            let password = this.password;
            if(this.account.proxy?.constructor?.name == "Proxy") {
                let proxyObject = this.account.proxy;
                let options = {};
                if(proxyObject.isSocks()) options = {socksProxy: this.account.proxy.getProxyUrl()}
                else options = {httpProxy: this.account.proxy.getProxyUrl()};
                this.session = new SteamSession.LoginSession(SteamSession.EAuthTokenPlatformType.MobileApp, options);
                this.account.proxy = this.account.proxy.getProxyUrl();
            }
            this.session.on('authenticated', async () => {
                let accessToken = this.session.accessToken;
                let refreshToken = this.session.refreshToken;
                let cookies = await this.session.getWebCookies();
                this.community.setCookies(cookies);
                if(this.account.guard) {
                    this.account.guard.Session = {};
                    this.account.guard.Session.SteamID = this.community.steamID.getSteamID64();            
                    this.account.guard.Session.AccessToken = accessToken;
                    this.account.guard.Session.RefreshToken = refreshToken;
                }
                

                this.account.proxy = this.account.proxy ? this.account.proxy.constructor.name == "Proxy" ? this.account.proxy.getProxyToSave() : this.account.proxy : this.account.proxy;
                this.account.password = this.password;
                this.account.maFileName = `${this.community.steamID.getSteamID64()}.maFile`;
                saveAccount(this.account, this.community.steamID.getSteamID64());
                new Logger(`(${this.account.account_name}) AddUser is success`, "log");
                this.callback();
            });
            this.session.on('timeout', () => {
                this.onError(new Error('This login attempt has timed out.'));
                new Logger(`(${this.account.account_name}) This login attempt has timed out.`, "error");
                
            });
            this.session.on('error', (err) => {
                this.onError(err);
                new Logger(`(${this.account.account_name}) ${err.message}`, "error");
                
            });
            let startResult = await this.session.startWithCredentials({accountName: login, password: password});
            if (startResult.actionRequired) {
                let codeActionTypes = [SteamSession.EAuthSessionGuardType.EmailCode, SteamSession.EAuthSessionGuardType.DeviceCode];
                let codeAction = startResult.validActions.find(action => codeActionTypes.includes(action.type));
                let text = ``;
                if (codeAction) {
                    if (codeAction.type == SteamSession.EAuthSessionGuardType.EmailCode) {
                       text = `A code has been sent to your email address at ${codeAction.detail}.`;
                    } else {
                       
                        text = 'You need to provide a Steam Guard Mobile Authenticator code.';
                    }
                }
                if(codeAction.type == SteamSession.EAuthSessionGuardType.DeviceCode && this.account.guard) {
                    await this.session.submitSteamGuardCode(SteamTotp.generateAuthCode(this.account.guard.shared_secret));
                }
                else {
                    let code = await this.waitForInput(`Enter a ${codeAction.type == SteamSession.EAuthSessionGuardType.DeviceCode ? 'Steam Guard Mobile Authenticator code' : 'code from your email'} (${this.account.account_name}): `);
                    if (code) {
                        await this.session.submitSteamGuardCode(code);
                    }
                }
            }
        } catch(e) {
            
            new Logger(`(${this.account.account_name}) {IMPORT MAFILE} ${e.message}`, "error");
            
            this.onError(e);
        }
        
    }
    async waitForInput(text) {
        return new Promise((resolve,reject) => {
            /*
            let WFIWindow = new this.electron.BrowserWindow({
                width: 400,
                height: 250,
                minWidth: 400,
                minHeight: 250,
                transparent: true,
                frame: false,
                show: false,
                skipTaskbar: true,
                webPreferences: {
                    nodeIntegration: true,
                    enableRemoteModule: true,
                    contextIsolation: false,
                    devTools: false
                }
            })
            WFIWindow.loadURL(this.electron.app.isPackaged ? `${this.electron.app.getAppPath()}\\build\\index.html#${'/needInput'}` : 'http://localhost:3000/needInput');
            WFIWindow.webContents.on('did-finish-load', () => {
                WFIWindow.setTitle(`SteamGuard adding`);
                WFIWindow.webContents.send('wait-for-input', text);
                WFIWindow.show();
                WFIWindow.setSkipTaskbar(false);
            });
            this.electron.ipcMain.on('response-wait-for-input', (event, value) => {
                if(event.sender.id != WFIWindow.id) return;
                WFIWindow.destroy();
                resolve(value);
            });
            this.electron.ipcMain.on('close-window', (event) => {
                if(event.sender.id != WFIWindow.id) return;
                this.session.cancelLoginAttempt();
                reject(new Error("You closed the window"));
            })*/
            let id = generateUniqueId();
            this.electron.notificationWindow.webContents.send("add-notification", {
                id: id,
                icon: `logo.ico`,
                title:`${this.account.account_name}`,
                type: 'input',
                message: text,
                actions: []
            });
            this.electron.ipcMain.on('data-notification', (event,data) => {
                if(data.id != id) return;
                if(data.data == 'send') resolve(data.value);
                else {
                    this.session.cancelLoginAttempt();
                    reject(new Error("You closed the window"));
                }
            })
        });
    }
}

module.exports = {
    AddGuard,
    AddUser
};