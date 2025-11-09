export interface NotificationStruct {
    uniqueId: string;
    userId: string,
    title: string,
    body: string,
    isDeleted: boolean,
    type: NotificationType,
    seen: boolean,
    createdAt?: any,
}

export enum NotificationType {
    SYSTEM = 'system',
    CHAT = 'chat',
    AD = 'ad'
}