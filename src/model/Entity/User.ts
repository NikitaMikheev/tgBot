import { Table, Column, Model, DataType } from "sequelize-typescript";

@Table
export class User extends Model {
    @Column
    userId: number;

    @Column({type: DataType.STRING})
    action: string | null;

    @Column({type: DataType.STRING})
    actionEmail: string | null;

    @Column({type: DataType.STRING})
    actionApiKey: string | null;

    @Column({type: DataType.STRING})
    actionSecretKey: string | null;
}