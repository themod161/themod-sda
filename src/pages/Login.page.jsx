import { useEffect, useState } from 'react';

import PersonIcon from '@mui/icons-material/Person';
import './Settings.page.css'
import TextInput from '../components/TextInput/TextInput';
import HttpsIcon from '@mui/icons-material/Https';
import SelectInput from '../components/SelectItem/SelectItem';
import TextComponent from '../components/Text/Text';
import InfoIcon from '@mui/icons-material/Info';
import { addNotify } from '../components/Notify/Notify';
import { Navigate } from 'react-router-dom';
import { Tooltip } from 'react-tooltip'
import 'react-tooltip/dist/react-tooltip.css'

const { ipcRenderer } = window.require('electron');


export default function LoginPage() {
    let [accData, setAccData] = useState({
        account_name: "",
        password: "",
        proxy: "",
        tempProxy: {protocol: undefined, ip: undefined, port: undefined, username: undefined, password: undefined}
    });
    let [checkProxyStatus, setCheckProxyStatus] = useState(false);
    let [needRedirect, setNeedRedirect] = useState(false);
    useEffect(() => {
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
    const toSave = () => ({account_name: accData.account_name, password: accData.password, proxy: accData.proxy, display_name: accData.display_name})
    /*const doRequest = async(proxyString) => {
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
                new Logger(`(PROXY RESPONSE ${accData.account_name || ""}) ${proxy}`, "log");
                setCheckProxyStatus(`Ok (${proxy})`);
            }
        } catch (error) {
            new Logger(`(CHECK PROXY ${accData.account_name || ""}) ${error.message}`, "error");
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

    const clearProxy = () => {
        setAccData((prev)=>({
            ...prev,
            proxy: "",
            tempProxy: {protocol: undefined, ip: undefined, port: undefined, username: undefined, password: undefined}
        }));
        setCheckProxyStatus(false);
        accData.proxy = "";
    }*/

    const formatIp = (input) => {
        let value = input;
        value = value.replace(/[^\d.]/g, '');
        
        const groups = value.split('.');
        let result = new Array(4).fill("");
        groups.forEach((x,i)=> {
            x = x.replace(/^[0]+/gm, '');
            if(x > 255) {
                result[i] = x.slice(0, -1);
                if(i < 3 && x.at(-1) != '0') result[i+1] = x.at(-1) + result[i+1];
            }
            else result[i] = x;
        })

        return result.filter(x=> x != '').join('.');
    };

    const goBack = () => {
        setNeedRedirect(true);
    }
    const goLogin = () => {
        if(!accData.account_name) return addNotify('You must enter your login', 'error');
        if(!accData.password) return addNotify('You must enter your password', 'error');
        let tempProxyLength = Object.keys(accData.tempProxy).filter(x=> !!accData.tempProxy[x]).length;
        if(!accData.proxy && (tempProxyLength == 3 || tempProxyLength == 5)) return addNotify('After your login you need check your proxy', "info");
        if(!accData.proxy && (tempProxyLength != 0 && tempProxyLength != 3 && tempProxyLength != 5)) return addNotify('Not all required fileds are filled', "warning");
        ipcRenderer.send('try-add-account', {account_name: accData.account_name, password: accData.password, proxy: accData.proxy});
    }
    const changeField = (e, field) => {
        let newObj = {};
        e.target.value = e.target.value.replace(/\s/g, '');
        if(Array.isArray(field)) {
            newObj[field[0]] = JSON.parse(JSON.stringify(accData[field[0]]));
            if(field[1] == "ip") {
                const sanitizedValue = formatIp(e.target.value);
                e.target.value = sanitizedValue;
            }
            newObj[field[0]][field[1]] = e.target.value;
        }
        else newObj[field] = e.target.value;
        setAccData((prev)=> ({...prev, ...newObj}));
    } 
    if(needRedirect) return <Navigate to='/import'/>;
    if (Object.keys(accData).length == 0) return <>Loading...</>;
    return (
        <div className='settings-page-inner nDragble nSelected'>
            <h2>Add new account</h2>
            <div className='settings-page-title'><h3><PersonIcon/> Account</h3></div>
            <hr/>
            <TextInput title={"Login:"} onInput={(e)=> changeField(e, "account_name")} value={accData.account_name} />
            <TextInput title={"Password:"} onInput={(e)=> changeField(e, "password")} value={accData.password} />
            <div className="settings-page-buttons">
                <div className="settings-page-button" onClick={goBack}>Back</div>
                <div className="settings-page-button" onClick={goLogin}>Login</div>
            </div>

            <div className='settings-page-title'>
                <h3><HttpsIcon/> Proxy <span data-tooltip-id="loginPageProxy" data-iscapture="true" style={{display: "flex", marginLeft: "5px", color: "gray"}}>
                    <InfoIcon style={{fontSize: "large"}}/> 
                </span>
                </h3>
            </div>
                
            <hr />
            <TextComponent title={"Reset proxy:"} value={<div onClick={()=> {let clearProxy = 1}} className='check-proxy-button'>Reset proxy</div>}/>
            <TextComponent title={"Check proxy:"} value={<div onClick={()=> {let canCheckProxy}} className='check-proxy-button' disabled={checkProxyStatus == "Pending"}>Check proxy</div>}/>
            {checkProxyStatus == false ? <></> : <TextComponent title={"Status:"} value={checkProxyStatus} /> }
            <SelectInput title={"Protocol:"} disabled={checkProxyStatus == "Pending"} value={accData.tempProxy.protocol} onChange={(e)=> changeField(e, ["tempProxy","protocol"])}/>
            <TextInput title={"IP:"} disabled={checkProxyStatus == "Pending"} onInput={(e)=> changeField(e, ["tempProxy","ip"])} maxLength={15} value={accData.tempProxy.ip} />
            <TextInput title={"Port:"} disabled={checkProxyStatus == "Pending"} onInput={(e)=> changeField(e, ["tempProxy","port"])} maxLength={5} value={accData.tempProxy.port} />
            <TextInput title={"Username:"} disabled={checkProxyStatus == "Pending"} onInput={(e)=> changeField(e, ["tempProxy","username"])} value={accData.tempProxy.username} />
            <TextInput title={"Password:"} disabled={checkProxyStatus == "Pending"} onInput={(e)=> changeField(e, ["tempProxy","password"])} value={accData.tempProxy.password} />
            <Tooltip id="loginPageProxy" aria-haspopup="true">
                    For the Proxy to be saved you need to check it.<br/>The "Check proxy' button
                </Tooltip>
        </div>
    );
}