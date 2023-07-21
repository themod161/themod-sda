import { useEffect, useState } from 'react';
import './Footer.css';

const {ipcRenderer, shell} = window.require('electron');
const request = window.require('request');

export function Footer() {
    let [appVersion, setAppVersion] = useState("");
    let [lastVersion, setLastVersion] = useState("");
    let [iv, setIv] = useState(-1);
    useEffect(()=> {
        const getAppVersion = async () => {
            let res = await ipcRenderer.invoke('getAppVersion');
            setAppVersion(`v${res}`);
        }
        const checkForLastVersion = async () => {
            let res = await new Promise((resolve,reject) => {
                request('https://github.com/themod161/themod-sda/releases/latest', (error, response) => {
                    if (error) return reject(error);
                    let r = response.request.href.match(/(?<version>[0-9.]+)$/m);
                    if(r) return resolve(r.groups.version);
                    return resolve(response.request.href);
                });
            })
            setLastVersion(`v${res}`);
        }
        getAppVersion();
        checkForLastVersion();

        setIv(setInterval(()=> {
            getAppVersion();
            checkForLastVersion();
        }, 1000*60*30));
        return () => {
            clearTimeout(iv);
        }
    }, [])
    const compareVersions = (a, b) => a.replace('v', '').split('.').map(Number) > b.replace('v', '').split('.').map(Number);
    const openTelegram = () => {
        shell.openExternal('https://t.me/themod_products');
    }
    const openGithub = () => {
        shell.openExternal('https://github.com/themod161/themod-sda/releases/latest');
    }
    console.log(appVersion && lastVersion && compareVersions(lastVersion, appVersion) ? '*' : '', appVersion, lastVersion, appVersion && lastVersion && compareVersions(lastVersion, appVersion));
    return <div className="footer-inner nDragble nSelected"><span className="footer-author" onClick={openTelegram}>THEMOD &copy;</span><span className="footer-app-version" onClick={openGithub}>{appVersion}{appVersion && lastVersion && compareVersions(lastVersion, appVersion) ? '*' : ''}</span></div>;
}