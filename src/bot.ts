import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv'; 
import path from 'path';
import axios, { AxiosResponse } from 'axios';
import { connect } from './connectDB';
import { commands } from './commands';
import { Email } from './model/Entity/Email';
import { Keys } from './model/Entity/Keys';
import { User } from './model/Entity/User';
import { IBotState, IDataValues, IDomen } from './types/types';
import { addEmailAndKey } from './model/repository/addEmailAndKey';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

export default class Bot {
    client: TelegramBot;

    constructor() {
        this.client = new TelegramBot(String(process.env.API_KEY_BOT), {polling: true}) // создаем экземпляр класса
    };

    async listen(): Promise<void> {
        try {
            const botState: IBotState = {
                add_key_email: 'add_key_email',
                add_key: 'add_key',
                add_key_secret: 'add_key_secret',
                get_domens: 'get_domens',
                get_email: 'get_email'
            };

            await connect(); // подключение базы данных и sequelize
            await this.client.setMyCommands(commands); // подключаем комманды к боту

            this.client.onText(/\/menu/, async () => { // команда /menu возвращает клавиатуру
                await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), 'Меню бота', {
                    reply_markup: {
                        keyboard: [
                            [{text: '\u{0001F4C3} Получить все домены'}, {text: '\u{0001F4BB} Узнать почту домена'}],
                            [{text: '\u{0001F527} Добавить API key и API secret'}],
                            [{text: '\u{0000274C} Остановить команды \u{0000274C}'}]
                        ],
                        resize_keyboard: true
                    },
                });
            });

            this.client.on('message', async (msg) => { // прослушивание сообщений пользователя

                if (msg.from === undefined || msg.from.id === undefined) { 
                    throw new Error('ID пользователя не определен');
                }
            
                let user = await User.findOne({where: { // находим пользователя по id в базе данных
                    userId: msg.from.id
                }});

                if (!user) { // если пользователя нет - создаем его. По умолчанию поле action будет равняться null
                    
                    user = new User({userId: msg.from.id})
                    user.action = null;
                    await user.save();
                };

                if (msg.text === '/stop' || msg.text === '/stop@GodaddyCheckerBot' || msg.text === '\u{0000274C} Остановить команды \u{0000274C}') {
                    user.action = null; // вычищаем action из базы данных, команды сбросятся
                    await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), 'Команда сброшена');
                }

                switch (user.action) {
                    case botState.add_key_secret:
                        if (msg.text === undefined) {
                            await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), 'Секретный ключ не передан, попробуйте еще раз');
                        }

                        else {
                            user.actionSecretKey = msg.text;
                            user.action = null;
                            const res = await addEmailAndKey(user);
                            res instanceof Error ? await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), 'Переданные ключи не валидны, попробуй еще раз') :  await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), 'Email и ключи сохранены');
                        }
                        break;

                    case botState.add_key:
                        if (msg.text === undefined) {
                            await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), 'Ключ не передан, попробуйте еще раз');
                        }

                        else {
                            user.actionApiKey = msg.text;
                            user.action = botState.add_key_secret;
                            await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), 'Введите API secret');
                        }
                        break;

                    case botState.add_key_email:
                        if (msg.text === undefined || !(/\S+@\S+\.\S+/.test(msg.text))) {
                            await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), 'Email не валиден, попробуйте еще раз');
                        }
                        
                        else {
                            user.actionEmail = msg.text;
                            user.action = botState.add_key;
                            await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), 'Введите API key');
                        };
                        break;
                    
                    case botState.get_domens:
                        if (msg.text === undefined) {
                            await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), 'Почта не передана, попробуйте еще раз');
                        }

                        else {
                            const email = await Email.findOne({include: [Keys], where: {
                                email: msg.text
                            }});
                
                            if (!email) { // уведомляет пользователя, если email не найден
                                await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), 'В базе данных отсутствует указанный email');
                            }

                            else {
                                let res: AxiosResponse | Error | boolean = false;
                                for (let key of email.key) { // отлавливаем email, где все ключи невалидные. Если хотя бы 1 ключ валиден - получаем информацию
                                    res = await this.getDomens(key.dataValues);
                                
                                    if (!(res instanceof Error)) {
                                        break;
                                    }
                                }

                                if (res instanceof Error || res === false) {
                                    await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), 'У указанного email отсутствуют валидные ключи');
                                }

                                else {
                                    let message = `Список доменов для ${msg.text}:`
                                    for (let item of res.data) {
                                        const newMessage = message + `\n${item.domain}`
                                        if (newMessage.length > 4096) {
                                            await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), message);
                                            message = `\n${item.domain}`;
                                            continue; 
                                        }
                                        message+=`\n${item.domain}`;
                                    }
                                    await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), message);
                                }

                                user.action = null;
                            }
                      
                        }
                        break;
                    
                    case botState.get_email:
                        if (msg.text === undefined) {
                            await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), 'Домен не передан, попробуйте еще раз');
                        }

                        else {
                            const emails = await Email.findAll({include: [Keys]});

                            if (emails.length === 0) { // уведомляет пользователя, если email не найден
                                await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), 'В базе данных отсутствуют emails');
                            }

                            else {
                                let domen = false;
                                let mail: string = '';
                                for (let email of emails) {
                                    let res: AxiosResponse | Error | boolean = false;
                                    
                                    for (let key of email.key) { // отлавливаем email, где все ключи невалидные. Если хотя бы 1 ключ валиден - получаем информацию
                                        res = await this.getDomens(key.dataValues);
                                    
                                        if (!(res instanceof Error)) {
                                            break;
                                        };
                                    };
                                    
                                    if (res instanceof Error || res === false) {
                                        continue;
                                    };
                                                              
                                    for (let item of res.data) {
                                        if (item.domain === msg.text) {
                                            
                                            domen = item.domain;
                                            mail = email.email;
                                            break;
                                        };
                                    };

                                    if (domen && mail) {
                                        break;
                                    };
                                };
                                
                                
                                domen ? await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), `Домен ${msg.text} относится к почте ${mail}`) : await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), `Домен ${msg.text} не был найден`);
                            };

                            user.action = null;
                        };

                        break;
                };

                if (msg.text === '/domens' || msg.text === '/domens@GodaddyCheckerBot' || msg.text === '\u{0001F4C3} Получить все домены') {
                    
                    user.action = botState.get_domens;
                    await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), 'Введите почту, чтобы получить список всех доменов, привязанных к ней');
                    
                };

                if (msg.text === '/email' || msg.text === '/email@GodaddyCheckerBot' ||  msg.text === '\u{0001F4BB} Узнать почту домена') {
                    user.action = botState.get_email;
                    await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), 'Введите домен, чтобы узнать почту, к которой он привязан');
                };
                
                if ((msg.text === '/add_key' || msg.text === '/add_key@GodaddyCheckerBot' || msg.text === '\u{0001F527} Добавить API key и API secret') && user.action === null) {
                    user.action = botState.add_key_email;
                    await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), 'Введите email, к которому будут добавляться ключи');
                };

                await user.save();
            });

            setInterval(async () => {
                const domensArray: IDomen[] = [];
                const emails = await Email.findAll({include: [Keys]});
                
                if (emails.length === 0) { // уведомляет пользователя, если email не найден
                    await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), 'В базе данных отсутствуют emails');
                }
                
                else {
                    for (let email of emails) {
                        let res: AxiosResponse | Error | boolean = false;
                        for (let key of email.key) { // отлавливаем email, где все ключи невалидные. Если хотя бы 1 ключ валиден - получаем информацию
                            res = await this.getDomens(key.dataValues);
                        
                            if (!(res instanceof Error)) {
                                break;
                            };
                        };
                        
                        if (res instanceof Error || res === false) {
                            await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), `В email ${email.dataValues.email} отсутствуют валидные ключи`);
                            continue;
                        };

                        for (let item of res.data) {
                            const expires: number = Math.floor((Date.parse(item.expires)-Date.now()) / (1000 * 3600 * 24)); // подсчет количества дней до истечения домены
                            
                            if (expires === 30 || expires === 15 || expires === 7 || expires === 1) { // если осталось 30, 15, 7 или 1 день, тогда формируем объект для подготовки сообщения в телеграмме
                                const domen: IDomen = {
                                    name: item.domain,                  // имя
                                    expires: expires,                   // количество дней до истечения
                                    email: email.dataValues.email       // почта, к которой привязан домен
                                };
                                if (item.renewAuto) {
                                    domen['renew'] = true;              // включено ли автопродление
                                };
                                domensArray.push(domen);
                            };
                        };
                    };

                    let message: string = '';
                    for (let domen of domensArray) { // цикл проходит по каждому элементу массива и формирует сообщение для отправки в телеграмм
                        const newMessage = this.createMessage(domen);

                        if (message.length + newMessage.length > 4096) { // ограничение на 1 сообщение в телеграмм составляет 4096 символов. Сравниваем подготовленный фрагмент сообщения и уже сформированные части
                            await this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), message);
                            message = newMessage;  
                        }

                        else {
                            message += newMessage;
                        };
                    }

                    if (message.length !== 0) {
                        this.client.sendMessage(String(process.env.API_BOT_CHAT_ID), message);
                    }
                }
            }, 86400000) // функция получения доменов отрабатывает 1 раз в сутки
        } catch (error) {
            console.log(error);
        };
    };

    async getDomens(email: IDataValues): Promise<AxiosResponse | Error> { // получение доменов
        try {
            const res: AxiosResponse | Error = await axios('https://api.godaddy.com/v1/domains?statuses=ACTIVE', { // запрос доменов со статусом ACTIVE
            headers: {
                'Authorization': `sso-key ${email.api_key}:${email.api_secret}` // ключи авторизации
            },
        });
        
        if (res instanceof Error) {
            throw new Error(res.message);
        };

        return res;  
        } catch (error) {
            return error;
        };
    };

    createMessage(domen: IDomen): string { // функция формирует новый фрагмент сообщения
        let message: string = `Имя домена: ${domen.name}\n`;
        message = message + `Количество дней до истечения: ${domen.expires}\n`;
        message = message + `Email: ${domen.email}`;
        
            if (domen.renew) {
                message = message + '\nАвтопродление включено';
            };

        return message + '\n\n\n';
    };
};