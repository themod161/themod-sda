import { useEffect, useState } from 'react';
import Client from '../steamUtils/client.class';
import { Proxy, parseProxy } from '../steamUtils/proxy.class';
import PersonIcon from '@mui/icons-material/Person';
import './Settings.page.css'
import TextInput from '../components/TextInput/TextInput';
import HttpsIcon from '@mui/icons-material/Https';
import SelectInput from '../components/SelectItem/SelectItem';
import TextComponent from '../components/Text/Text';
import { saveAccount } from '../steamUtils/utils.class.js';
import { addNotify } from '../components/Notify/Notify';
import Logger from '../steamUtils/logger.class';
import ControlInput from '../components/ControlInput/ContolInput';

const { ipcRenderer } = window.require('electron');


export default function SettingsPage() {
    let [activeAccount, setActiveAccount] = useState(undefined);
    let [accData, setAccData] = useState({});
    let [checkProxyStatus, setCheckProxyStatus] = useState(false);
    useEffect(() => {
        ipcRenderer.on('account-load', async (event, account) => {
            account = await new Client({}).restore(JSON.parse(account));
            setActiveAccount(account);
            setAccData({
                account_name: account.getAccountName(),
                password: account.account.password || "",
                proxy: account.account.proxy ||"",
                display_name: account.account.display_name || "",
                auto_confirm: account.account.auto_confirm || false,
                tempProxy: parseProxy(account.account.proxy || "") || {protocol: undefined, ip: undefined, port: undefined, username: undefined, password: undefined}
            })
        });
    }, []);

    const checkForProxy = () => {
        let proxy = accData.tempProxy;
        if(!proxy.protocol) proxy.protocol = 'http';
        if(proxy.port && proxy.protocol && proxy.ip) {
            if(proxy.username && proxy.password) return `${proxy.protocol.toLowerCase()}://${proxy.username}:${proxy.password}@${proxy.ip}:${proxy.port}`;
            else return `${proxy.protocol.toLowerCase()}://${proxy.ip}:${proxy.port}`;
        }
        return false;
    }
    const toSave = () => ({account_name: accData.account_name, password: accData.password, proxy: accData.proxy, auto_confirm: accData.auto_confirm, display_name: accData.display_name})
    const doRequest = async(proxyString) => {
        try {
            setCheckProxyStatus(`Pending`);
            let prClass = new Proxy(parseProxy(proxyString));
            let proxy = await prClass.testProxy();
            if(proxy) {
                setAccData((prev)=>({
                    ...prev,
                    proxy: prClass.proxy
                }));
                accData.proxy = prClass.proxy;
                saveAcc();
                setCheckProxyStatus(`Ok (${proxy})`);
                new Logger(`(PROXY RESPONSE ${activeAccount.getAccountName()}) Ok (${proxy})`, "log");
            }
        } catch (error) {
            new Logger(`(CHECK PROXY ${activeAccount.getAccountName()}) ${error.message}`, "error");
            setCheckProxyStatus(error.message);
        }
    }  
    const canCheckProxy = () => {
        let result = checkForProxy();
        if(!result){
            addNotify("Not valid proxy format", "warning");
            return false;
        } 
        
        doRequest(result)
    }
    const saveAcc = () => {
        
        activeAccount.account = {
            ...activeAccount.account,
            ...toSave()
        }
        saveAccount(activeAccount);
        ipcRenderer.send('update-account-by-username', activeAccount.stringify());
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
    }, [accData.auto_confirm])
    if (Object.keys(accData).length === 0 && !activeAccount) return <>Loading...</>;
    return (
        <div className='settings-page-inner nDragble nSelected'>
            <h2>Settings {activeAccount.getAccountName()}</h2>
            <div className='settings-page-title'><h3><PersonIcon/> Account</h3></div>
            <hr/>
            <TextInput title={"Login:"} onComplete={saveAcc} onInput={(e)=> changeField(e, "account_name")} disabled={true} value={accData.account_name} />
            <TextInput title={"Password:"} onComplete={saveAcc} onInput={(e)=> changeField(e, "password")} value={accData.password} />
            <TextInput title={"Display name:"} onComplete={saveAcc} onInput={(e)=> changeField(e, "display_name")} value={accData.display_name} />
            <ControlInput title={"Auto confirm:"} onChange={(e)=> {
                changeField({target: {value: !accData.auto_confirm}}, "auto_confirm");
            }} value={accData.auto_confirm} />
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