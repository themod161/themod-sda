const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamSession = require('steam-session');
const { parseProxy, Proxy } = require('./proxy.class.cjs');
const EResult = SteamCommunity.EResult;
const fs = require('fs');
const electron = require('electron');
const crypto = require('crypto');
const { BrowserWindow } = require('electron');
const Logger = require('./logger.class.cjs');
const {saveAccount} = require('./utils.class.cjs');


class Client {
    constructor(account) {
        this.account = account || {};
        this.proxy = this.account.proxy ? new Proxy(parseProxy(this.account.proxy)) : {};
        this.client = this.proxy.string ? new SteamUser(this.proxy.getProxyInString()) : new SteamUser();
        this.community = this.proxy.string ? new SteamCommunity({ "request": this.proxy.getRequest() }) : new SteamCommunity();
        this.manager = new TradeOfferManager({
            steam: this.client,
            community: this.community,
            language: 'en'
        });
        this.session = this.proxy.string ? new SteamSession.LoginSession(SteamSession.EAuthTokenPlatformType.MobileApp, this.proxy.getProxyInString()) : new SteamSession.LoginSession(SteamSession.EAuthTokenPlatformType.MobileApp);
        this.details = {
            sessionID: null,
            cookies: null
        };
        this.onLoginStatusChanged = ()=> {};
        this.loginStatus = "none";
    }
    getAccount() {
        return this.account;
    }
    setOnLoginStatusChanged(callback) {
        this.onLoginStatusChanged = callback;
    }
    getSessionId = () => crypto.randomBytes(12).toString('hex');
    async waitForInput(text) {
        return text;
    }
    setCookies(cookies) {
        return new Promise((resolve,reject) => {
            
            this.community.setCookies(cookies);
            this.manager.setCookies(cookies, (err)=> {
                if(err) {
                    if(err.eresult === EResult.AccessDenied) {
                        this.loginStatus = "total";
                        
                        this.onLoginStatusChanged("total");
                    }
                    this.loginStatus = "error";
                    this.onLoginStatusChanged("error");
                    return reject(err);
                }
                
                new Logger(`(${this.account.account_name}) Cookie setted`);
                
                this.setManagerNewOfferEvent();
                this.loginStatus = "logged";
                this.onLoginStatusChanged(this.loginStatus);
                resolve();
            });
        })
    }
    setManagerNewOfferEvent() {
        let addNewOffer = async(offer) => {
            offer.partner.steamID64 = offer.partner.getSteamID64();
            new Logger(`(${this.account.account_name}) New offer`, "log");
            let newOffer = await this.getOfferByIdWithInfo(offer);
            console.log(newOffer);
            
            electron.ipcMain.emit('new-offer', {account_name: this.getAccountName(),newOffer});
        };
        this.manager.on('newOffer', addNewOffer);
    }
    async login() {
        if(!this.account.guard) return;
        this.loginStatus = "logging";
        this.onLoginStatusChanged("logging");
        
        if(this.account.guard.Session) {
            new Logger(`(${this.getAccountName()}) Auth by session`, "log")
            await this.setCookies(await this.getCookies());
            return;
        }
        let login = this.account.account_name || await this.waitForInput('Write login:');
        let password = this.account.password || await this.waitForInput('Write password:');
        console.log("81", this.account);
        new Logger(`(${this.getAccountName()}) Auth by login`, "log")
        try {
            this.session.on('authenticated', async () => {
                let accessToken = this.session.accessToken;
                let cookies = await this.session.getWebCookies();
               
               
                this.saveSession(this.account.maFileName, cookies);
                this.community.setMobileAppAccessToken(accessToken);

                return await this.setCookies(await this.getCookies());
                
                
            });
            this.session.on('timeout', () => {
                
                this.loginStatus = "error";
                this.onLoginStatusChanged("error");
                new Logger(`(${this.getAccountName()}) {LOGIN} This login attempt has timed out.`, "error");
                addNotify(`${this.getAccountName()}: This login attempt has timed out.`, "info");
            });
            this.session.on('error', (err) => {
                
                this.loginStatus = "error";
                this.onLoginStatusChanged("error");
                new Logger(`(${this.getAccountName()}) {LOGIN} ${err.message}`, "error");
                addNotify(`${this.getAccountName()}: ${err.message}`, "error");
            });
            let startResult = await this.session.startWithCredentials({accountName: login, password: password, steamGuardCode: this.getGuardCode()});
            if (startResult.actionRequired) {
        
                let codeActionTypes = [SteamSession.EAuthSessionGuardType.EmailCode, SteamSession.EAuthSessionGuardType.DeviceCode];
                let codeAction = startResult.validActions.find(action => codeActionTypes.includes(action.type));
                let text;
                if (codeAction) {
                    if (codeAction.type === SteamSession.EAuthSessionGuardType.EmailCode) {
                        text = `A code has been sent to your email address at ${codeAction.detail}.`;;
                    } else {
                       
                       text = 'You need to provide a Steam Guard Mobile Authenticator code.';
                    }
                }
                let code = this.getGuardCode() || await this.waitForInput(text);
                if (code) {
                    await this.session.submitSteamGuardCode(code);
                }
            }
        } catch(e) {
            console.log(e);
            this.loginStatus = "error";
            this.onLoginStatusChanged("error");
            
            new Logger(`(${this.getAccountName()}) {LOGIN} ${e.message}`, "error");
        }
    }
    replaceFields(source, target) {
        for (const key in source) {
            if (typeof source[key] === 'object' && typeof target[key] === 'object') {
                this.replaceFields(source[key], target[key]);
            } else if (typeof source[key] !== 'function') {
                target[key] = source[key];
            }
        }
    }
    getGuardCode() {
        return this.account.guard ? SteamTotp.generateAuthCode(this.getSharedSecret()) : undefined;
    }
    getSteamID() {
        return this.account.guard.Session.SteamID;
    }
    getOAuthToken() {
        return this.account.guard.Session.OAuthToken;
    }
    isTokenExpired(token) {
        if(!token) return false;
        const tokenComponents = token.split('.');
        let base64 = tokenComponents[1].replace('-', '+').replace('_', '/');

        if (base64.length % 4 !== 0) base64 += '='.repeat(4 - base64.length % 4);
        const data = atob(base64);
        const array = JSON.parse(data);
        
        return Math.floor(Date.now() / 1000) > array.exp;
    }
    getAccessToken() {
        return this.account.guard?.Session?.AccessToken ? this.account.guard.Session.AccessToken : "";
    }
    getRefreshToken() {
        return this.account.guard?.Session?.RefreshToken ? this.account.guard.Session.RefreshToken : "";
    }
    isAccessTokenExpired() {
        return this.isTokenExpired(this.getAccessToken());
    }
    isRefreshTokenExpired() {
        return this.isTokenExpired(this.getRefreshToken());
    }
    async updateAccessToken() {
        if(!this.isAccessTokenExpired() || !this.getRefreshToken()) return;
        if(this.isRefreshTokenExpired()) this.account.guard.Session = undefined;
        let session = new SteamSession.LoginSession(SteamSession.EAuthTokenPlatformType.WebBrowser);
        session.refreshToken = this.getRefreshToken();
        await session.refreshAccessToken();
        
        this.account.guard.Session.AccessToken = session.accessToken;
        saveAccount(this, {update: true});
        return session.accessToken;
    }
    async getCookies() {
        if(!this.account.guard.Session) return [];
        
        await this.updateAccessToken();
        
        let session = this.account.guard.Session;
        if(session.AccessToken && session.SteamID) {
            if(!session.SessionID) {
                session.SessionID = this.getSessionId();
                saveAccount(this.account, {update: true});
            }
           
            return [`sessionID=${session.SessionID}`,`steamLoginSecure=${session.SteamID}%7C%7C${session.AccessToken}`];
        }
        let cookies = Object.keys(session).map(key=> {
            if(key === "SteamID") return undefined;
            if(key === "") return undefined;

            if(key === "SessionID" && session[key] === null) session[key] = this.getSessionId();
            return `${key.charAt(0).toLowerCase() + key.slice(1)}=${session[key]}`
        }).filter(x=> !!x);
        
        return cookies;
    }
    saveSession(fileName, cookies) {
        if(!fileName) {
            let mf = getMaFiles();
            fileName = mf.find(x=> x.account_name === this.account.account_name ).maFileName;
        }
        let maFile = fs.readFileSync(`./maFiles/${fileName}`, 'utf8');
        maFile = JSON.parse(maFile);
        maFile.Session = {};
        maFile.Session.SteamID = this.community.steamID.getSteamID64();
        cookies.forEach(cookie=> {
            let key = cookie.split('=')[0];
            let value = cookie.split('=')[1];
            key = key.charAt(0).toUpperCase() + key.slice(1);
            maFile.Session[key] = value;
        });
        
        fs.writeFileSync(`maFiles/${fileName}`, JSON.stringify(maFile));
        this.account.guard.Session = maFile.Session;
    }
    stringify() {
        const cache = new Set();
        return JSON.stringify(this, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (cache.has(value)) {

                    return;
                }
                cache.add(value);
            }
            return value;
        });
    };
    getIdentitySecret() {
        return this.account.guard.identity_secret;
    }
    async restore(acc) {
        if (acc.details) {
            this.account = acc.account;
            if (this.account.proxy.string) {
                this.proxy = this.account.proxy?.string ? new Proxy(parseProxy(this.account.proxy.string)) : {};
                this.client = this.proxy.string ? new SteamUser(this.proxy.getProxyInString()) : new SteamUser();
                this.community = this.proxy.string ? new SteamCommunity({ "request": this.proxy.getRequest() }) : new SteamCommunity();
                this.manager = new TradeOfferManager({
                    steam: this.client,
                    community: this.community,
                    language: 'en'
                });
                this.session = this.proxy.string ? new SteamSession.LoginSession(SteamSession.EAuthTokenPlatformType.MobileApp, this.proxy.getProxyInString()) : new SteamSession.LoginSession(SteamSession.EAuthTokenPlatformType.MobileApp);
            }


            this.replaceFields(this.client, acc.client);
        }

        return this;
    }
    getOffersList() {
        
        return new Promise(resolve => {
            this.manager.getOffers(TradeOfferManager.EOfferFilter.ActiveOnly, async (err, sent, received) => {
                if (err) return resolve({ error: err });


                let promises = received.map(async tradeOffer => {
                    return await new Promise(resolve => tradeOffer.getUserDetails((err, me, them) => {
                        if (err) return resolve({ error: err });
                        tradeOffer.partner.steamID64 = tradeOffer.partner.getSteamID64();
                        resolve({
                            id: tradeOffer.id,
                            title: 'TF - ',
                            tradeOffer,
                            tradeInformation: { me, them }
                        })
                    }));
                });
                Promise.all(promises)
                    .then(data => {
                        resolve(data);
                    })
                    .catch(error => {
                        new Logger(`(${this.getAccountName()}) {OFFERSLIST} ${error.message}`, "error");
                        resolve({ error: error });
                    });
            });
        });
    }
    getOfferById(offerId) {
        return new Promise((resolve, reject) => {
            this.manager.getOffer(offerId, (err, offer) => {
                if (err) {
                    new Logger(`(${this.getAccountName()}) ${err.message}`, "error");
                    resolve({ error: err })
                }
                resolve(offer);
            })
        })

    }
    answerOffer(offerOld, answer = false) {
        return new Promise((resolve, reject) => {
            this.getOfferById(offerOld.id).then((offer) => {
                if (offer.error) return new Logger(`(${this.getAccountName()}) ${offer.error}`, "error");;
                if (!answer) {
                    offer.decline((err) => {
                        if (err) {
                            new Logger(`(${this.getAccountName()}) ${err.message}`, "error");
                            reject(err);
                        }
                        else {
                            new Logger(`(${this.getAccountName()}) Trade offer ${offer.id} declined`, "log");
                            resolve("Trade offer " + offer.id + " declined");
                        }
                    })
                }
                else offer.accept((err, status) => {
                    if (err) {
                        new Logger(`(${this.getAccountName()}) Unable to accept offer: ${err.message}`, "error");
                        
                        reject(err);
                    } else {
                        
                        if (status !== 'pending') {
                            new Logger(`(${this.getAccountName()}) Trade offer ${offer.id}: ${status}`, "log");
                        }
                        if (status === "pending") {
        
                            this.community.acceptConfirmationForObject(this.account.guard.identity_secret, offer.id, (err) => {
                                if (err) {
                                    
                                    new Logger(`(${this.getAccountName()}) Unable to accept offer: ${err.message}`, "error");
                                    reject(err);
                                } else {
                                    
                                    new Logger(`(${this.getAccountName()}) Trade offer ${offer.id} confirmed`, "log");
                                    resolve("Trade offer " + offer.id + " confirmed");
                                }
                            });
                        }
                        else resolve("Trade offer " + offer.id + " confirmed");
                    }
                });
            });
        })
    }
    getSharedSecret() {
        return this.account.guard.shared_secret;
    }
    getAccountName() {
        return this.account.account_name;
    }
    getDisplayName() {
        return this.account.display_name;
    }
    onWebSession(_this, sessionID, cookies) {
        _this.details = { sessionID, cookies };
        this.setCookies(cookies);
    }
    onLogin(_this) {
        
        _this.account.logged = true;
    }
    answerToConfirmation(id, key, answer = false) {
        return new Promise((resolve, reject) => {
            let time_conf = Math.floor(Date.now() / 1000);
            let key_conf = SteamTotp.getConfirmationKey(this.account.guard.identity_secret, time_conf, answer ? 'allow' : 'cancel');
            this.community.respondToConfirmation(id, key, time_conf, key_conf, answer, (err) => {
                if (err) {
                    new Logger(`(${this.getAccountName()}) ${err.message}`, "error");
                    reject(err.message);
                }
                else {
                    new Logger(`(${this.getAccountName()}) Confirmation was successfully ${answer ? "confirmed" : "declined"}`, "log");
                    resolve(`Confirmation was successfully ${answer ? "confirmed" : "declined"}`);
                }
            });
        });

    }
    getOfferByIdWithInfo(offer) {
        return new Promise(async resolve =>
            offer.getUserDetails((err, me, them) => {
                if (err) {
                    new Logger(`(${this.getAccountName()}) ${err.message}`, "error");
                    return resolve({ error: err });
                }
                resolve({
                    id: offer.id,
                    title: 'TF - ',
                    tradeOffer: offer,
                    tradeInformation: { me, them }
                });
            })
        );
    }
    getTradeInfo(id) {
        return new Promise((resolve, reject) => {
            this.manager.getOffer(id, (err, offer) => {
                if (err) {
                    new Logger(`(${this.getAccountName()}) ${err.message}`, "error");
                    resolve({ error: err });
                }
                else {
                    new Logger(`(${this.getAccountName()}) Info about trade (${offer.id}) loaded`, "log");
                }
                offer.partner.steamID64 = offer.partner.getSteamID64();
                resolve(offer);
            });
        });
    }
    async getConfirmationList() {
        let time_conf = Math.floor(Date.now() / 1000);
        let key_conf = SteamTotp.getConfirmationKey(this.account.guard.identity_secret, time_conf, 'conf');

        return new Promise((resolve, reject) => {


            this.community.getConfirmations(time_conf, key_conf, (err, confirmations) => {
                if (err) {
                    new Logger(`(${this.getAccountName()}) {CONFIRMATIONS} ${err.message}`, "error");
                    resolve({ error: err });
                }
                else {
                    new Logger(`(${this.getAccountName()}) {CONFIRMATIONS} checked`, "log");
                    resolve(confirmations || []);
                }
            })
        })
    }
}

module.exports = Client;