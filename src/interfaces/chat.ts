export interface RoomStruct {
    roomId: string;
    isBlocked: boolean;
    blockedBy: string;
    userId1: string;
    userId2: string;
    sellerId: string;
    propertyId: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ChatStruct {
    chatId: string;
    roomId: string;
    isDeleted: boolean;
    type: ChatType;
    isImp: boolean;
    userId: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ChatMessageStruct {
    uniqueId: string;
    roomId: string,

    senderId: string,
    receiverId: string,

    message: string,
    status: MessageStatus,
    type: MessageType,
    createdAt?: Date;
    updatedAt?: Date;
}

export enum ChatType {
    BUY = "buy",
    SELL = "sell",
}

export enum MessageStatus {
    PENDING = "pending",
    SENT = "sent",
    DELIVERED = "delivered",
    SEEN = "seen",
    DELETED = "deleted",
    EXPIRED = "expired"
}

export enum MessageType {
    TEXT = 'text',
    IMAGE = 'image',
    FILE = 'file'
}