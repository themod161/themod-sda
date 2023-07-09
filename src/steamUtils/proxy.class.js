import Logger from './logger.class';

const request = window.require('request');

export const parseProxy = (proxyString) => {
    const proxyRegex = /^(socks|http)s?:\/\/(?:([^:@]+):([^:@]+)@)?([^:]+):(\d+)$/i;
    
    if(proxyString.length === 0 || Object.keys(proxyString).length === 0) return "";
    const match = proxyString.match(proxyRegex);
    
    if (!match) {
      throw new Error('Invalid proxy string');
    }
  
    const [, protocol, username, password, ip, port] = match;
    return {
      protocol: protocol.toLowerCase(),
      username: username || undefined,
      password: password || undefined,
      ip,
      port: parseInt(port, 10),
      string: proxyString
    };
}

export class Proxy {
    constructor(proxy) {
        if(proxy.protocol.includes('socks')) {
            proxy.protocol = "http";
            proxy.string = proxy.string.replace('socks', 'http');
        }
        this.protocol = proxy.protocol;
        this.string = proxy.string;
        
       
       
        
        this.proxy = proxy.protocol.includes('socks') ? proxy.string : proxy.string;
        this.is_Socks = proxy.protocol.includes('socks');
        this.url = "https://google.com";
    }
    getProxyUrl() {
        return this.string;
    }
    isSocks() {
        return this.is_Socks;
    }
    getProxyAgent() {
        return this.proxy;
    }
    async testProxy () {
        return new Promise((resolve,reject)=> {
            try {
                request(this.url, {proxy: this.proxy}, (error, response) => {
                    if (error) return reject(error);
                    return resolve(response.statusCode);
                })
            } catch (error) {
                new Logger(`(${this.getAccountName()}) {TESTPROXY} ${error.message}`, "error");
                reject(error);
            }
        })
    };
    getProxyInString() {
        if(this.is_Socks) return {"socksProxy": this.string}
        else return {"httpProxy": this.string}
    }
    getProxyToSave() {
        return {
            protocol: this.protocol,
            string: this.string,
            proxy: this.proxy
        }
    }
    getProxy() {
        return this;
    }
    getRequest() {
        
        return this.is_Socks ? request.defaults({"agent": this.proxy}) : request.defaults({"proxy": this.proxy});
    }
}