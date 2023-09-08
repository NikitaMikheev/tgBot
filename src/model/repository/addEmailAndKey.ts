import { Email } from "../Entity/Email";
import { User } from "../Entity/User";
import { Keys } from "../Entity/Keys";
import axios, { AxiosResponse } from "axios";

export const addEmailAndKey = async (user: User): Promise<void | Error> => {
    try {
        
    const res: AxiosResponse | Error = await axios('https://api.godaddy.com/v1/domains?statuses=ACTIVE', { // запрос доменов со статусом ACTIVE
        headers: {
            'Authorization': `sso-key ${user.actionApiKey}:${user.actionSecretKey}` // ключи авторизации
        }
    });

    const newKey = new Keys({
        api_key: user.actionApiKey,
        api_secret: user.actionSecretKey
    });

    let email = await Email.findOne({
        where: {
            email: user.actionEmail
        },
        include: Keys
    });

    if (email) {
        email.key.push(newKey);
        await email.save();
    }
    
    else {
        email = await Email.create({
            email: user.actionEmail,
            Keys: [newKey]
        })

    };
    
    newKey.emailId = email.id;
    await newKey.save();

    user.actionApiKey = null;
    user.actionSecretKey = null;
    user.actionEmail = null;

    await user.save();
    } catch (error) {
        return error;
    };
};