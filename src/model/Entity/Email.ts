import { Table, Column, Model, HasMany, PrimaryKey } from "sequelize-typescript";
import { Keys } from "./Keys";

@Table
export class Email extends Model 
{
    @PrimaryKey
    @Column({autoIncrement: true})
    id: number

    @Column
    email: string;

    @HasMany(() => Keys) // many-to-one
    key: Keys[]
}