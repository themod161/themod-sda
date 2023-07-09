const logsPath = './logs';
const path = require('path');
const logFile = path.join(logsPath, 'logs.log');
const errorFile = path.join(logsPath, 'error.log');
const fs = require('fs');

class Logger {
    constructor(text, type = "log" || "error") {
        this.writeLogToFile(text, type);
    }
    
    writeLogToFile(text, type) {
        let file = type == "log" ? logFile : errorFile;
        let existingContent = "";
        if (!fs.existsSync(logsPath)) fs.mkdirSync(logsPath);
        if (fs.existsSync(file)) existingContent = fs.readFileSync(file, 'utf-8') || "";
        const newLine = `${this.getCurrentDateTime()}: ${text}`;
        const updatedContent = existingContent + '\n' + newLine;
        fs.writeFileSync(file, updatedContent, 'utf-8');
    }
    getCurrentDateTime() {
        const now = new Date();
        
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear());
        
        const dateTimeString = `[${hours}:${minutes}:${seconds} ${day}.${month}.${year}]`;
        
        return dateTimeString;
      }
}
module.exports = Logger;