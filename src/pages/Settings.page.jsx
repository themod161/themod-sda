import { useEffect, useState } from 'react';
import PersonIcon from '@mui/icons-material/Person';
import './Settings.page.css'
import TextInput from '../components/TextInput/TextInput';
import HttpsIcon from '@mui/icons-material/Https';
import SelectInput from '../components/SelectItem/SelectItem';
import TextComponent from '../components/Text/Text';
import { addNotify } from '../components/Notify/Notify';
import ControlInput from '../components/ControlInput/ContolInput';

const { ipcRenderer } = window.require('electron');


export default function SettingsPage() {
    let [activeAccount, setActiveAccount] = useState(undefined);
    let [accData, setAccData] = useState({});
    let [checkProxyStatus, setCheckProxyStatus] = useState(false);
    useEffect(() => {
        ipcRenderer.on('account-load', async (event, account) => {
            setActiveAccount(account);
            setAccData({
                account_name: account.account_name,
                password: account.password || "",
                proxy: account.proxy ||"",
                display_name: account.display_name || "",
                auto_login: account.auto_login || false,
                auto_confirm_market: account.auto_confirm_market || false,
                auto_confirm_trades: account.auto_confirm_trades || false,
                tempProxy: parseProxy(account.proxy || "") || {protocol: undefined, ip: undefined, port: undefined, username: undefined, password: undefined}
            })
        });
    }, []);
    const parseProxy = (proxyString) => {
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
    const checkForProxy = () => {
        let proxy = accData.tempProxy;
        if(!proxy.protocol) proxy.protocol = 'http';
        if(proxy.port && proxy.protocol && proxy.ip) {
            if(proxy.username && proxy.password) return `${proxy.protocol.toLowerCase()}://${proxy.username}:${proxy.password}@${proxy.ip}:${proxy.port}`;
            else return `${proxy.protocol.toLowerCase()}://${proxy.ip}:${proxy.port}`;
        }
        return false;
    }
    const toSave = () => ({account_name: accData.account_name, password: accData.password, proxy: accData.proxy, auto_login: accData.auto_login, auto_confirm_market: accData.auto_confirm_market, auto_confirm_trades: accData.auto_confirm_trades, display_name: accData.display_name})
    const doRequest = async(proxyString) => {
        try {
            setCheckProxyStatus(`Pending`);
            let proxy = await ipcRenderer.invoke('check-proxy', proxyString);
            console.log(proxy);
            if(typeof proxy == 'object') throw new Error(proxy.error);
            if(proxy) {
                setAccData((prev)=>({
                    ...prev,
                    proxy: proxyString
                }));
                accData.proxy = proxyString;
                saveAcc();
                setCheckProxyStatus(`Ok (${proxy}). Proxy saved`);
                ipcRenderer.send('logger',`(PROXY RESPONSE ${activeAccount.account_name}) Ok (${proxy})`, "log");
            }
        } catch (error) {
            error.message = error.message.replace("Error invoking remote method 'check-proxy': ", '');
            ipcRenderer.send('logger',`(CHECK PROXY ${activeAccount.account_name}) ${error.message}`, "error");
            setCheckProxyStatus(error.message);
        }
    }  
    const canCheckProxy = () => {
        if(checkProxyStatus === "Pending") return;
        let result = checkForProxy();
        if(!result){
            addNotify("Not valid proxy format", "warning");
            return false;
        } 
        
        doRequest(result)
    }
    const saveAcc = () => {
        
        activeAccount = {
            ...activeAccount,
            ...toSave()
        }
        ipcRenderer.send('update-account-by-username', activeAccount);
    }

    const clearProxy = () => {
        setAccData((prev)=>({
            ...prev,
            proxy: "",
            tempProxy: {protocol: undefined, ip: undefined, port: undefined, username: undefined, password: undefined}
        }));
        setCheckProxyStatus(false);
        accData.proxy = "";
        saveAcc();
    }

    const formatIp = (input) => {
        let value = input;
        value = value.replace(/[^\d.]/g, '');
        
        const groups = value.split('.');
        let result = new Array(4).fill("");
        groups.forEach((x,i)=> {
            x = x.replace(/^[0]+/gm, '');
            if(x > 255) {
                result[i] = x.slice(0, -1);
                if(i < 3 && x.at(-1) !== '0') result[i+1] = x.at(-1) + result[i+1];
            }
            else result[i] = x;
        })

        return result.filter(x=> x !== '').join('.');
    };
    const changeField = (e, field) => {
        let newObj = {};
        
        if(typeof e.target.value === 'string' && field != "display_name")e.target.value = e.target.value.replace(/\s/g, '');
        if(Array.isArray(field)) {
            newObj[field[0]] = JSON.parse(JSON.stringify(accData[field[0]]));
            if(field[1] === "ip") {
                const sanitizedValue = formatIp(e.target.value);
                e.target.value = sanitizedValue;
            }
            newObj[field[0]][field[1]] = e.target.value;
        }
        else newObj[field] = e.target.value;
        
        setAccData((prev)=> ({...prev, ...newObj}));
    } 
    useEffect(()=> {
        if(Object.keys(accData).length !== 0 && activeAccount) saveAcc();
    }, [accData.auto_confirm_trades, accData.auto_confirm_market, accData.auto_login]);
    if (Object.keys(accData).length === 0 && !activeAccount) return <>Loading...</>;
    return (
        <div className='settings-page-inner nDragble nSelected'>
            <h2>Settings {activeAccount.account_name}</h2>
            <div className='settings-page-title'><h3><PersonIcon/> Account</h3></div>
            <hr/>
            <TextInput title={"Login:"} onComplete={saveAcc} onInput={(e)=> changeField(e, "account_name")} disabled={true} value={accData.account_name} />
            <TextInput title={"Password:"} needHide={true} hide={true} onComplete={saveAcc} onInput={(e)=> changeField(e, "password")} value={accData.password} />
            <TextInput title={"Display name:"} onComplete={saveAcc} onInput={(e)=> changeField(e, "display_name")} value={accData.display_name} />
            <ControlInput title={"Market auto-confirm:"} onChange={(e)=> {
                changeField({target: {value: !accData.auto_confirm_market}}, "auto_confirm_market");
            }} value={accData.auto_confirm_market} />
            <ControlInput title={"Trades auto-confirm:"} onChange={(e)=> {
                changeField({target: {value: !accData.auto_confirm_trades}}, "auto_confirm_trades");
            }} value={accData.auto_confirm_trades} />
            <ControlInput title={"Auto-login:"} onChange={(e)=> {
                changeField({target: {value: !accData.auto_login}}, "auto_login");
            }} value={accData.auto_login} />
            <div className='settings-page-title'><h3><HttpsIcon/> Proxy</h3></div>
            <hr />
            <TextComponent title={"Reset proxy:"} value={<div onClick={clearProxy} className='check-proxy-button'>Reset proxy</div>}/>
            <TextComponent title={"Check proxy:"} value={<div onClick={canCheckProxy} className='check-proxy-button' disabled={checkProxyStatus === "Pending"}>Check proxy</div>}/>
            {checkProxyStatus === false ? <></> : <TextComponent title={"Status:"} value={checkProxyStatus} /> }
            <SelectInput title={"Protocol:"} disabled={checkProxyStatus === "Pending"} value={accData.tempProxy.protocol} onChange={(e)=> changeField(e, ["tempProxy","protocol"])}/>
            <TextInput title={"IP:"} disabled={checkProxyStatus === "Pending"} onInput={(e)=> changeField(e, ["tempProxy","ip"])} maxLength={15} value={accData.tempProxy.ip} />
            <TextInput title={"Port:"} disabled={checkProxyStatus === "Pending"} onInput={(e)=> changeField(e, ["tempProxy","port"])} maxLength={5} value={accData.tempProxy.port} />
            <TextInput title={"Username:"} disabled={checkProxyStatus === "Pending"} onInput={(e)=> changeField(e, ["tempProxy","username"])} value={accData.tempProxy.username} />
            <TextInput title={"Password:"} disabled={checkProxyStatus === "Pending"} onInput={(e)=> changeField(e, ["tempProxy","password"])} value={accData.tempProxy.password} />
        </div>
    );
}