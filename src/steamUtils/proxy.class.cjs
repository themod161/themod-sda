const Logger = require('./logger.class.cjs');

const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const axios = require('axios');
const request = require('request');


const parseProxy = (proxyString) => {
    const proxyRegex = /^(socks|http)s?:\/\/(?:([^:@]+):([^:@]+)@)?([^:]+):(\d+)$/i;
    
    if(proxyString.length == 0 || !proxyString) return "";
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

class Proxy {
    constructor(proxy) {
        this.protocol = proxy.protocol;
        this.string = proxy.string;
        this.proxy = proxy.protocol.includes('socks') ? new SocksProxyAgent(proxy.string) : new HttpsProxyAgent(proxy.string);
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
        
        return this.is_Socks ? request.defaults({"agent": this.proxy}) : request.defaults({"proxy": this.string});
    }
    async testProxy() {
        try {
            let res = await axios.get(this.url, { httpsAgent: this.proxy || false, httpAgent: this.proxy || false, timeout: 5000 });
            new Logger(`{TESTPROXY} Proxy ${this.string} is ${res.status == 200 ? 'working' : 'not working'}`);
            console.log(res, this.string, this.proxy);;
            return res.status;
            
        } catch (error) {
            new Logger(`() {TESTPROXY} ${error.message}`, "error");
            return {
                error: error.message
            }
            
        }
    }
}
module.exports = {
    parseProxy,
    Proxy
}