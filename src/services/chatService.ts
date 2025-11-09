import { Service, Inject, Container } from 'typedi';
import { Request, Response } from 'express';
import Common from '@/services/commonService';
import { ChatMessageStruct, ChatStruct, ChatType, MessageStatus, MessageType, RoomStruct } from '@/interfaces/chat';
import { WebSocketMessage } from '@/sockets/webSocketMessage';
import UserService from './userService';
import { IUser } from '@/interfaces/IUser';
import ReportUserService from './reportUserService';
import { ReportUserStruct } from '@/interfaces/reportUser';

@Service()
export default class ChatService {
    constructor(
        @Inject('logger') private logger,
        @Inject('roomModel') private RoomModel: Models.RoomModel,
        @Inject('chatModel') private ChatModel: Models.ChatModel,
        @Inject('userModel') private UserModel: Models.UserModel,
        @Inject('chatMessageModel') private ChatMessageModel: Models.ChatMessageModel,
        @Inject('propertyModel') private PropertyModel: Models.PropertyModel
    ) { }

    public async createRoom(req: Request, res: Response)
        : Promise<{ message: string | RoomStruct; flag: boolean }> {
        try {
            const { propertyId, otherUserId } = req.body;
            const userId = req['userId']; // from auth middleware

            if (userId == otherUserId) {
                return { message: 'UserId mismatched.', flag: false };
            }

            const property = await this.PropertyModel
                .findOne({ uniqueId: propertyId })
                .select('title titleArabic price images sellerId')
                .lean();
            if (!property) {
                return { message: 'Property not found', flag: false };
            }

            const propertyDetails = {
                title: property.title,
                titleArabic: property.titleArabic,
                price: property.price,
                image: property.images?.[0] || null
            };

            const otherUser = await this.UserModel
                .findOne({ uniqueId: otherUserId })
                .select('name profile uniqueId')
                .lean();
            if (!otherUser) {
                return { message: 'Other user not found', flag: false };
            }

            const sellerUser = await this.UserModel
                .findOne({ uniqueId: property.sellerId })
                .select('phone')
                .lean();

            // Check if room already exists
            let room = await this.RoomModel.findOne({
                propertyId,
                $or: [
                    { userId1: userId, userId2: otherUserId },
                    { userId1: otherUserId, userId2: userId }
                ]
            }).lean();

            // Create new room if it doesn't exist
            if (!room) {
                room = await this.RoomModel.create({
                    roomId: Container.get(Common).generateUniqueID(process.env.ROOM_PREFIX),
                    userId1: userId,
                    userId2: otherUserId,
                    sellerId: property.sellerId,
                    propertyId,
                    isBlocked: false,
                    blockedBy: ''
                });
            }

            // Check if room already exists
            let roomBlock = await this.RoomModel.findOne({
                isBlocked: true, roomId: { $ne: (room?.['_doc']?.roomId || room?.roomId) },
                $or: [
                    { userId1: userId, userId2: otherUserId },
                    { userId1: otherUserId, userId2: userId }
                ]
            });

            const buyerChat = await this.ChatModel.findOneAndUpdate(
                { userId: userId, roomId: (room?.['_doc']?.roomId || room?.roomId) },
                {
                    chatId: Container.get(Common).generateUniqueID(process.env.CHAT_PREFIX),
                    roomId: (room?.['_doc']?.roomId || room?.roomId),
                    userId: userId,
                    type: userId == property.sellerId ? ChatType.SELL : ChatType.BUY,
                    isDeleted: false,
                    isImp: false
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            // Check if there's a previous report between these users
            const prevReport: { message: string | ReportUserStruct, flag: boolean } =
                await Container.get(ReportUserService).getEntry({
                    userId: otherUserId,
                    reporterId: userId
                });

            const roomObj = room?.['_doc'] || room as RoomStruct;
            return {
                message: {
                    ...roomObj,
                    propertyDetails: propertyDetails,
                    otherUserDetails: otherUser,
                    sellerMobile: sellerUser?.phone || null,
                    prevBlock: roomBlock?.blockedBy || null,
                    prevReport: prevReport.flag ? (prevReport.message as ReportUserStruct)?.reporterId : null
                } as any, flag: true
            };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async sendMessage(req: Request, res: Response)
        : Promise<{ message: string; flag: boolean }> {
        try {
            const { roomId, message, type = MessageType.TEXT } = req.body;
            const userId = req['userId'];

            // Verify that user has access to the room
            const room = await this.RoomModel.findOne({
                roomId,
                $or: [{ userId1: userId }, { userId2: userId }]
            });

            if (!room) {
                return { message: 'Room not found or access denied.', flag: false };
            }

            const receiverId = room.userId1 === userId ? room.userId2 : room.userId1;

            if (room.isBlocked && room.blockedBy === userId) {
                return { message: 'You have blocked this user.', flag: false };
            }

            if (room.isBlocked && room.blockedBy === receiverId) {
                return { message: 'This chat is unavailable.', flag: false };
            }

            // const receiver = await Container.get(UserService)
            //     .getUsersBasedOnFilter({ uniqueId: receiverId });

            // if ((receiver.message as IUser).blockedUsers.includes(userId)) {
            //     return { message: 'You are blocked.', flag: false };
            // }

            // Create ChatStruct (individual user view) for buyer and seller
            const buyerChat = await this.ChatModel.findOneAndUpdate(
                { userId: userId, roomId: room.roomId },
                {
                    chatId: Container.get(Common).generateUniqueID(process.env.CHAT_PREFIX),
                    roomId: room.roomId,
                    userId: userId,
                    type: userId == room.sellerId ? ChatType.SELL : ChatType.BUY,
                    isDeleted: false,
                    isImp: false
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            const sellerChat = await this.ChatModel.findOneAndUpdate(
                { userId: receiverId, roomId: room.roomId },
                {
                    chatId: Container.get(Common).generateUniqueID(process.env.CHAT_PREFIX),
                    roomId: room.roomId,
                    userId: receiverId,
                    type: receiverId == room.sellerId ? ChatType.SELL : ChatType.BUY,
                    isDeleted: false,
                    isImp: false
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            const messageData: ChatMessageStruct = {
                uniqueId: Container.get(Common).generateUniqueID(process.env.CHAT_MESSAGE_PREFIX),
                roomId,
                senderId: userId,
                receiverId,
                message,
                type,
                status: MessageStatus.SENT
            };

            const savedMessageDoc = await this.ChatMessageModel.create(messageData);
            const savedMessage = savedMessageDoc.toObject(); // This is now a plain JS object
            await Container.get(WebSocketMessage).prodcastMessage(savedMessage);

            return { message: 'Message sent successfully', flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getChatById(roomId: string, userId: string)
        : Promise<{ message: string | ChatStruct; flag: boolean }> {
        try {
            // const chat = await this.ChatModel.findOne({ roomId: roomId, userId: userId }).lean();
            // if (!chat) {
            //     return { message: "Chat not found.", flag: false };
            // }
            const chat = await this.ChatModel.aggregate([
                {
                    $match: { roomId: roomId, userId: userId },
                },
                {
                    $lookup: {
                        from: 'rooms',
                        localField: 'roomId',
                        foreignField: 'roomId',
                        as: 'room'
                    }
                },
                { $unwind: '$room' },
                {
                    $lookup: {
                        from: 'properties',
                        localField: 'room.propertyId',
                        foreignField: 'uniqueId',
                        as: 'property'
                    }
                },
                { $unwind: '$property' },
                {
                    $lookup: {
                        from: 'chatmessages',
                        let: { roomId: '$roomId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$roomId', '$$roomId'] } } },
                            { $sort: { createdAt: -1 } },
                            { $limit: 1 }
                        ],
                        as: 'lastMessage'
                    }
                },
                { $unwind: { path: '$lastMessage', preserveNullAndEmptyArrays: true } },
                {
                    $addFields: {
                        receiverId: {
                            $cond: {
                                if: { $eq: ['$room.userId1', userId] },
                                then: '$room.userId2',
                                else: '$room.userId1'
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'receiverId',
                        foreignField: 'uniqueId',
                        as: 'receiver'
                    }
                },
                { $unwind: '$receiver' },
                {
                    $lookup: {
                        from: "chatmessages",
                        let: {
                            roomId: "$roomId",
                            receiverId: "$receiverId"
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$roomId", "$$roomId"] },
                                            {
                                                $eq: [
                                                    "$receiverId",
                                                    userId
                                                ]
                                            },
                                            {
                                                $in: [
                                                    "$status",
                                                    [MessageStatus.SENT, MessageStatus.DELIVERED]
                                                ]
                                            }
                                        ]
                                    }
                                }
                            },
                            { $count: "unreadCount" }
                        ],
                        as: "unreadMessages"
                    }
                },
                {
                    $addFields: {
                        unreadCount: {
                            $ifNull: [
                                {
                                    $arrayElemAt: [
                                        "$unreadMessages.unreadCount",
                                        0
                                    ]
                                },
                                0
                            ]
                        }
                    }
                },
                {
                    $project: {
                        unreadCount: "$unreadCount",
                        chatType: '$type',
                        chatId: '$chatId',
                        roomId: '$roomId',
                        isImp: 1,
                        isBlocked: '$room.isBlocked',
                        blockedBy: '$room.blockedBy',
                        receiverId: 1,
                        userId: 1,
                        receivername: '$receiver.name',
                        receiverprofile: '$receiver.profile',
                        propertyId: '$room.propertyId',
                        property: {
                            title: '$property.title',
                            price: '$property.price',
                            titleArabic: '$property.titleArabic',
                            image: { $arrayElemAt: ['$property.images', 0] }
                        },
                        lastMessage: '$lastMessage.message',
                        lastMessageStatus: '$lastMessage.status',
                        lastMessageSender: '$lastMessage.senderId',
                        lastMessageTime: '$lastMessage.createdAt'
                    }
                },
            ]);
            if (!chat) {
                return { message: "Chat not found.", flag: false };
            }

            return { message: chat[0], flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    /**
     * Get Chat List (grouped by buyer/seller and sorted by last message)
     */
    public async getChatList(req: Request, res: Response)
        : Promise<{ message: any; flag: boolean }> {
        try {
            const userId = req['userId'];

            const sessions = await this.ChatModel.aggregate([
                { $match: { userId: userId, isDeleted: false } },
                {
                    $lookup: {
                        from: 'rooms',
                        localField: 'roomId',
                        foreignField: 'roomId',
                        as: 'room'
                    }
                },
                { $unwind: '$room' },
                {
                    $lookup: {
                        from: 'properties',
                        localField: 'room.propertyId',
                        foreignField: 'uniqueId',
                        as: 'property'
                    }
                },
                { $unwind: '$property' },
                {
                    $lookup: {
                        from: 'chatmessages',
                        let: { roomId: '$roomId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$roomId', '$$roomId'] } } },
                            { $sort: { createdAt: -1 } },
                            { $limit: 1 }
                        ],
                        as: 'lastMessage'
                    }
                },
                { $unwind: { path: '$lastMessage', preserveNullAndEmptyArrays: true } },
                {
                    $addFields: {
                        receiverId: {
                            $cond: {
                                if: { $eq: ['$room.userId1', userId] },
                                then: '$room.userId2',
                                else: '$room.userId1'
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'receiverId',
                        foreignField: 'uniqueId',
                        as: 'receiver'
                    }
                },
                { $unwind: '$receiver' },
                {
                    $lookup: {
                        from: "chatmessages",
                        let: {
                            roomId: "$roomId",
                            receiverId: "$receiverId"
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$roomId", "$$roomId"] },
                                            {
                                                $eq: [
                                                    "$receiverId",
                                                    userId
                                                ]
                                            },
                                            {
                                                $in: [
                                                    "$status",
                                                    [MessageStatus.SENT, MessageStatus.DELIVERED]
                                                ]
                                            }
                                        ]
                                    }
                                }
                            },
                            { $count: "unreadCount" }
                        ],
                        as: "unreadMessages"
                    }
                },
                {
                    $addFields: {
                        unreadCount: {
                            $ifNull: [
                                {
                                    $arrayElemAt: [
                                        "$unreadMessages.unreadCount",
                                        0
                                    ]
                                },
                                0
                            ]
                        }
                    }
                },
                {
                    $project: {
                        unreadCount: "$unreadCount",
                        chatType: '$type',
                        chatId: '$chatId',
                        roomId: '$roomId',
                        isImp: 1,
                        isBlocked: '$room.isBlocked',
                        blockedBy: '$room.blockedBy',
                        receiverId: 1,
                        userId: 1,
                        receivername: '$receiver.name',
                        receiverprofile: '$receiver.profile',
                        propertyId: '$room.propertyId',
                        property: {
                            title: '$property.title',
                            price: '$property.price',
                            titleArabic: '$property.titleArabic',
                            image: { $arrayElemAt: ['$property.images', 0] }
                        },
                        lastMessage: '$lastMessage.message',
                        lastMessageStatus: '$lastMessage.status',
                        lastMessageSender: '$lastMessage.senderId',
                        lastMessageTime: '$lastMessage.createdAt'
                    }
                },
                { $sort: { lastMessageTime: -1 } }
            ]);

            return { message: sessions, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    /**
     * Get All Messages for a Chat Session
     */
    public async getMessages(req: Request, res: Response)
        : Promise<{ message: any; flag: boolean }> {
        try {
            const { roomId, page } = req.query;

            // 1. Fetch the messages BEFORE updating
            const messagesToUpdate = await this.ChatMessageModel
                .find({
                    roomId: roomId.toString(),
                    receiverId: req['userId'],
                    status: { $ne: MessageStatus.SEEN }
                })
                .lean(); // Use lean() if you don't need Mongoose doc methods

            // 2. Update all matching messages
            await this.ChatMessageModel.updateMany(
                {
                    roomId: roomId.toString(),
                    receiverId: req['userId'],
                    status: { $ne: MessageStatus.SEEN }
                },
                {
                    $set: { status: MessageStatus.SEEN }
                }
            );

            // 3. Broadcast each updated message
            for (const msg of messagesToUpdate) {
                msg.status = MessageStatus.SEEN; // Update the in-memory copy for broadcasting
                await Container.get(WebSocketMessage).prodcastMessage(msg, MessageStatus.SEEN);
            }

            const chat: ChatStruct = await this.ChatModel.findOne({ roomId: roomId.toString(), userId: req['userId'] });
            // if (!chat?.chatId) {
            //     return { message: "This chat is unavailable.", flag: false };
            // }

            if (chat?.isDeleted) {
                return { message: "This chat is unavailable.", flag: false };
            }

            let aggregate = [], flag = false;

            let obj = {
                $facet: {
                    totalCount: [
                        {
                            $count: "count"
                        },
                        {
                            $project: { _id: 0, count: 1 }
                        }
                    ],
                    data: []
                }
            };

            let matchObj = {
                $match: {
                    roomId: roomId,
                }
            };
            flag = true;

            if (flag) {
                obj.$facet.data.push(matchObj);
                // @ts-ignore
                obj.$facet.totalCount.splice(0, 0, matchObj);
            }

            const receiverLookup = {
                $lookup: {
                    from: 'users',
                    let: {
                        id: '$receiverId'
                    },
                    pipeline: [{
                        $match: {
                            $expr: {
                                $eq: ["$uniqueId", "$$id"]
                            }
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            uniqueId: 1,
                            name: 1,
                            phone: 1,
                            email: 1,
                            profile: 1
                        }
                    }],
                    as: 'receiver'
                }
            }

            const senderLookup = {
                $lookup: {
                    from: 'users',
                    let: {
                        id: '$senderId'
                    },
                    pipeline: [{
                        $match: {
                            $expr: {
                                $eq: ["$uniqueId", "$$id"]
                            }
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            uniqueId: 1,
                            name: 1,
                            phone: 1,
                            email: 1,
                            profile: 1
                        }
                    }],
                    as: 'sender'
                }
            }

            if (+page > 0) {
                const limit = +process.env.LIMIT || 20;
                const skip = (+page - 1) * limit;

                obj.$facet.data.push({ $sort: { createdAt: -1 } });
                obj.$facet.data.push({ $skip: skip });
                obj.$facet.data.push({ $limit: limit });
                // obj.$facet.data.push(senderLookup);
                // obj.$facet.data.push(receiverLookup);
                // obj.$facet.data.push({ $unwind: "$sender" });
                // obj.$facet.data.push({ $unwind: "$receiver" });
            }

            aggregate.push(obj);

            let query = await this.ChatMessageModel.aggregate(aggregate);
            if (query.length === 0) {
                return { message: { data: [], totalCount: 0 }, flag: true };
            }
            const result = query[0];

            return {
                message: {
                    data: result["data"] || [],
                    totalCount: result["totalCount"]?.[0]?.count || 0
                },
                flag: true
            };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async updateDeleteStatus(req: Request, res: Response)
        : Promise<{ message: string; flag: boolean }> {
        try {
            const { roomIds } = req.body;

            await this.ChatModel.updateMany({ roomId: { $in: roomIds }, userId: req['userId'] }, {
                $set: { isDeleted: true }
            });

            return { message: "Deleted successfully.", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async updateBlockStatus(req: Request, res: Response)
        : Promise<{ message: string; flag: boolean }> {
        try {
            const { roomIds } = req.body;

            await this.RoomModel.updateMany({
                roomId: { $in: roomIds },
                $or: [{ userId1: req['userId'] }, { userId2: req['userId'] }]
            }, {
                $set: { isBlocked: true, blockedBy: req['userId'] }
            });

            return { message: "Blocked successfully.", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async updateImportantStatus(req: Request, res: Response)
        : Promise<{ message: string; flag: boolean }> {
        try {
            const { roomIds, important } = req.body;

            await this.ChatModel.updateMany({ roomId: { $in: roomIds }, userId: req['userId'] }, {
                $set: { isImp: important }
            });

            return { message: "Updated successfully.", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async updateMessageStatus(req: Request, res: Response)
        : Promise<{ message: string; flag: boolean }> {
        try {
            const { roomId, messageId, status } = req.body;
            const userId = req['userId'];

            if (roomId) {
                // 1. Find all messages to be updated (before updating)
                const messagesToUpdate = await this.ChatMessageModel
                    .find({ roomId, status: { $ne: status }, receiverId: userId })
                    .lean();

                if (messagesToUpdate.length > 0) {
                    // 2. Update all of them
                    await this.ChatMessageModel.updateMany(
                        { roomId, status: { $ne: status }, receiverId: userId },
                        { $set: { status } }
                    );

                    // 3. Broadcast updated messages
                    for (const msg of messagesToUpdate) {
                        msg.status = status; // Update in-memory for correct broadcast
                        await Container.get(WebSocketMessage).prodcastMessage(msg, status);
                    }

                }
            } else if (messageId) {
                // Update single message and broadcast
                const updated = await this.ChatMessageModel.findOneAndUpdate(
                    { uniqueId: messageId, receiverId: userId },
                    { $set: { status } },
                    { new: true }
                );

                if (updated) {
                    await Container.get(WebSocketMessage).prodcastMessage(updated.toObject(), status);
                }
            } else {
                return { message: "Missing roomId or messageId", flag: false };
            }

            return { message: "Updated successfully.", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async updateMsgStatus(messageId: string, status: MessageStatus)
        : Promise<{ message: string; flag: boolean }> {
        try {
            await this.ChatMessageModel.findOneAndUpdate({ uniqueId: messageId }, {
                $set: { status: status }
            });

            // const updated = await this.ChatMessageModel.findOne({ uniqueId: messageId, receiverId: userId }).lean();

            // Container.get(WebSocketMessage).sendToUser(
            //     updated.senderId,
            //     updated.roomId,
            //     { allChat: false, messageId: true } as any
            // );

            return { message: "Updated successfully.", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getMessagesByRoomId(roomId: string)
        : Promise<{ message: ChatMessageStruct[] | string; flag: boolean }> {
        try {
            const msgs = await this.ChatMessageModel.find({ roomId: roomId });

            return { message: msgs, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getRoomById(roomId: string)
        : Promise<{ message: RoomStruct | string; flag: boolean }> {
        try {
            const msgs = await this.RoomModel.findOne({ roomId: roomId });

            return { message: msgs, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

}
