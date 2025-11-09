import Container, { Service, Inject } from "typedi";
import { Request, Response } from "express";
import admin from "firebase-admin";
import UserService from "./userService";
import { NotificationStruct, NotificationType } from "@/interfaces/notification";
import Common from "./commonService";
import { IUser } from "@/interfaces/IUser";
import { ChatType } from "@/interfaces/chat";

const serviceAccount = require('/files/firebase/shareek-61efc-firebase-adminsdk-2f46z-4a729346fa.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const topic = "ALL_USERS";

@Service()
export default class FirebaseService {
    constructor(
        @Inject('logger') private logger: any,
        @Inject('notificationModel') private NotificationModel: Models.NotificationModel
    ) { }

    // ✅ Common helper to save notifications
    private async saveNotificationRecord(params: {
        userId?: string;
        title: string;
        body: string;
        type: NotificationType;
        topic?: string;
    }) {
        const obj: NotificationStruct = {
            uniqueId: Container.get(Common).generateUniqueID(process.env.NOTIFICATION_PREFIX),
            userId: params.userId || null,
            title: params.title,
            body: params.body,
            isDeleted: false,
            type: params.type,
            seen: false
        };
        await this.NotificationModel.create(obj);
    }

    /**
     * 📨 Send Single Notification
     */
    public async sendNotification(filters: {
        fcmToken?: string;
        title: string;
        body: any;
        type: NotificationType;
        senderId?: string;
        pId?: string;
        receiverId?: string;
    }): Promise<{ message: string; flag: boolean }> {
        try {
            let token = '';

            if (!filters.fcmToken && filters.receiverId) {
                const user = await Container.get(UserService).getUsersBasedOnFilter({ uniqueId: filters.receiverId });
                token = (user.message as IUser).mobileToken;
            } else {
                token = filters.fcmToken;
            }

            const data: Record<string, string> = { type: String(filters.type) };
            if (filters.senderId) data['otherUserId'] = String(filters.senderId);
            if (filters.pId) data['propertyId'] = String(filters.pId);

            const message = {
                notification: { title: filters.title, body: String(filters.body) },
                token,
                data
            };

            await admin.messaging().send(message);

            if (filters.type !== NotificationType.CHAT && filters.receiverId) {
                await this.saveNotificationRecord({
                    userId: filters.receiverId,
                    title: filters.title,
                    body: String(filters.body),
                    type: filters.type
                });
            }

            return { message: "Successfully sent single message", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    /**
     * 📢 Send Multi Notification
     */
    public async sendNotifications(filters: {
        fcmTokens?: string[];
        receiverIds?: string[];
        title: string;
        body: any;
        // type: NotificationType;
    }): Promise<{ message: string; flag: boolean }> {
        try {
            let tokens: string[] = [];

            if (filters.fcmTokens?.length) {
                tokens = filters.fcmTokens;
            } else if (filters.receiverIds?.length) {
                for (const userId of filters.receiverIds) {
                    const user = await Container.get(UserService).getUsersBasedOnFilter({ uniqueId: userId });
                    const fcmToken = (user.message as IUser).mobileToken;
                    if (fcmToken) tokens.push(fcmToken);
                }
            }

            if (tokens.length === 0) {
                return { message: "No valid FCM tokens found", flag: false };
            }

            const message: admin.messaging.MulticastMessage = {
                notification: {
                    title: String(filters.title),
                    body: String(filters.body),
                },
                tokens,
                data: { type: String(NotificationType.SYSTEM) }
            };

            const response = await admin.messaging().sendEachForMulticast(message);

            // ✅ Save notifications to DB for each receiver
            // if (filters.type !== NotificationType.CHAT && filters.receiverIds?.length) {
            // for (const id of filters.receiverIds) {
            //     await this.saveNotificationRecord({
            //         userId: id,
            //         title: filters.title,
            //         body: String(filters.body),
            //         type: NotificationType.SYSTEM
            //     });
            // }
            // }

            // console.log(`${response.successCount} messages were sent successfully`);
            // console.log(`${response.failureCount} messages failed`);

            return { message: "Multicast message sent", flag: true };
        } catch (e: any) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    /**
     * 📡 Send Topic Notification
     */
    public async sendTopicNotification(title: string, body: any)
        : Promise<{ message: string; flag: boolean }> {
        try {
            const message = {
                notification: { title, body: String(body) },
                topic: topic,
                data: { type: String(NotificationType.SYSTEM) }
            };

            await admin.messaging().send(message);

            // ✅ Save topic notification as well
            // if (type !== NotificationType.CHAT) {
            // await this.saveNotificationRecord({
            //     title,
            //     body: String(body),
            //     type: NotificationType.SYSTEM,
            //     topic
            // });
            // }

            return { message: "Topic message sent", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async subscribeToTopic(req: Request, res: Response)
        : Promise<{ message: string; flag: boolean }> {
        try {
            // await admin.messaging().subscribeToTopic(req.body.token, topic);

            await Container.get(UserService).updateDetails({ id: req['userId'], token: req.body.token });

            return { message: `Token subscribed to topic ${topic}`, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async unsubscribeFromTopic(token: string): Promise<{ message: string; flag: boolean }> {
        try {
            // const response = await admin.messaging().unsubscribeFromTopic(token, topic);
            // console.log('Successfully unsubscribed:', response);
            return { message: `Token unsubscribed from topic ${topic}`, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getNotifications(req: Request, res: Response)
        : Promise<{ message: string | NotificationStruct[], flag: boolean }> {
        try {
            const msgs = await this.NotificationModel.find({ userId: req['userId'], isDeleted: false });
            return { message: msgs, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getNotificationList(req: Request, res: Response)
        : Promise<{ message: string | { data: NotificationStruct[], totalCount: number }, flag: boolean }> {
        try {
            let aggregate = [];
            let { page, searchTerm } = req.query;
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
                    $or: [],
                }
            };

            if (searchTerm) {
                matchObj.$match.$or.push({ name: { $regex: searchTerm, $options: 'i' } },
                    { name: { $regex: searchTerm, $options: 'i' } },
                    { email: { $regex: searchTerm, $options: 'i' } },
                    { phone: { $regex: searchTerm, $options: 'i' } },
                    { uniqueId: { $regex: searchTerm, $options: 'i' } },
                );
                obj.$facet.data.push(matchObj);
                // @ts-ignore
                obj.$facet.totalCount.splice(0, 0, matchObj);
            } else {
                delete matchObj.$match.$or;
            }

            if (+page < 1) {
                obj.$facet.data.push({ $sort: { createdAt: -1 } });
            } else {
                let skip = (+page - 1) * +process.env.LIMIT;
                obj.$facet.data.push({ $sort: { createdAt: -1 } });
                obj.$facet.data.push({ $skip: skip });
                obj.$facet.data.push({ $limit: +process.env.LIMIT });
            }
            aggregate.push(obj);

            let query = await this.NotificationModel.aggregate(aggregate);
            if (query.length === 0) {
                return { message: { data: [], totalCount: 0 }, flag: true };
            }
            let result = query[0];

            return {
                message: {
                    data: result["data"],
                    totalCount: result["totalCount"].length === 0 ? 0 : result["totalCount"][0].count
                }, flag: true
            };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }

    }

    public async markDelete(req: Request, res: Response)
        : Promise<{ message: string, flag: boolean }> {
        try {
            if (!req.body.id || req.body.id == 0) {
                await this.NotificationModel.findOneAndUpdate({ userId: req['userId'] },
                    { isDeleted: true }, { new: true }
                );
            } else {
                await this.NotificationModel.findOneAndUpdate({ uniqueId: req.body.id },
                    { isDeleted: true }, { new: true }
                );
            }
            return { message: "Deleted successfully.", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async markSeen(req: Request, res: Response)
        : Promise<{ message: string, flag: boolean }> {
        try {
            if (!req.body.id || req.body.id == 0) {
                await this.NotificationModel.findOneAndUpdate({ userId: req['userId'] },
                    { seen: true }, { new: true }
                );
            } else {
                await this.NotificationModel.findOneAndUpdate({ uniqueId: req.body.id },
                    { seen: true }, { new: true }
                );
            }
            return { message: "Seen successfully.", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }
}
