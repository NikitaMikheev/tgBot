import { Table, Column, Model, BelongsTo, ForeignKey } from "sequelize-typescript";
import { Email } from "./Email";

@Table
export class Keys extends Model {
    @Column
    api_key: string;

    @Column
    api_secret: string;

    @ForeignKey(() => Email)
    @Column
    emailId: number;

    @BelongsTo(() => Email)
    email: Email
}