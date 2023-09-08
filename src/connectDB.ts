import dotenv from 'dotenv';
import path from 'path';
import { Sequelize } from "sequelize-typescript";
import { Email } from "./model/Entity/Email";
import { Keys } from "./model/Entity/Keys";
import { User } from "./model/Entity/User";

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const sequelize = new Sequelize({
    database: String(process.env.MYSQL_DATABASE),
    dialect: 'mysql',
    username: 'root',
    password: String(process.env.MYSQL_PASSWORD),
    host: '172.18.0.3',
    models: [Keys, Email, User]
});

export const connect = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync();
        console.log('ok');
        
    } catch (error) {
        console.log(error);
    }    
} 