export interface IDomen {
    name: string,
    expires: number,
    email: string,
    renew?: boolean
}

export interface IDataValues {
    id: number,
    api_key: string,
    api_secret: string,
    createdAt: Date,
    updatedAt: Date
}

export interface IBotState {
    add_key_email: string,
    add_key: string,
    add_key_secret: string,
    get_domens: string,
    get_email: string
}
