const { default: Logger } = require("./logger.class.cjs");

const TBot = require('node-telegram-bot-api');

class TelegramBot {
    constructor(token, onCallbackQuery = ()=> {}) {
        this.bot_token = token;
        this.onCallbackQuery = onCallbackQuery;
        try {
            this.bot = new TBot(token, {polling: true });
            this.bot.on('callback_query', (query) => {
                onCallbackQuery(query);
                
                this.bot.answerCallbackQuery(query.id);
            });
            this.bot.on('polling_error', (error)=> {
                console.log(error.message);
            });
            
            this.sendMessage = (chatId, text, options = undefined) => {
                return this.bot.sendMessage(chatId, text, options);
            }
        } catch (error) {
            new Logger(`{TGBOT} ${error.message}`, "error");
        }
    }
}
module.exports = TelegramBot;