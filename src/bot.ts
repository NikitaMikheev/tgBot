import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv'; 
import path from 'path';
import OpenAI from 'openai';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const openai = new OpenAI({
    apiKey: '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'
});

const bot = new TelegramBot(String(process.env.API_KEY_BOT), {polling: true});

bot.on('message', async msg => {
    if (msg.text === '/start') {
        bot.sendMessage(msg.chat.id , msg.from?.first_name + ', добро пожаловать в чат бот!')
    }
    
    if (msg.text && msg.text !== '/start') {
        const res = await openai.chat.completions.create({
            messages: [{role: 'user', content: msg.text}],
            model: 'gpt-3.5-turbo'
        });
        console.log(msg.text);
        console.log(res.choices[0].message.content);
        
        bot.sendMessage(msg.chat.id, String(res.choices[0].message.content));
    }
    
})
