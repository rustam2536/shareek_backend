import Container, { Inject, Service } from 'typedi';
import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
// import { Model } from 'mongoose';
import { ChatMessageStruct, MessageStatus } from '@/interfaces/chat';
import { WebSocketContact } from './webSocketContact';
import ChatService from '@/services/chatService';
import FirebaseService from '@/services/firebaseService';
import UserService from '@/services/userService';
import { NotificationType } from '@/interfaces/notification';

@Service()
export class WebSocketMessage {
    private wss: WebSocketServer;
    private clients: Map<string, WebSocket> = new Map(); // Map of userId -> WebSocket

    constructor(
        // @Inject('chatMessageModel') private ChatMessageModel: Model<any>,
    ) { }

    public init(server: any): void {
        this.wss = new WebSocket.Server({ server: server, path: "/message" });
        // this.wss = new WebSocket.Server({ port: 3004, path: "/message" });
        this.mainSocket();
        // this.watchMongoCollection();
    }

    private mainSocket(): void {
        this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
            // Parse user ID from query param (e.g. ws://localhost:3000/socket?userId=123)
            const params = new URLSearchParams(req.url?.split('?')[1]);
            const userId = params.get('userId');
            const roomId = params.get('roomId');

            if (!userId) {
                ws.close(1008, 'Missing userId');
                return;
            }

            if (!roomId) {
                ws.close(1008, 'Missing roomId');
                return;
            }

            this.clients.set(userId + '-' + roomId, ws);

            ws.on('message', (msg) => {
                // console.log(`Message from ${userId}:`, msg.toString());
                // Handle incoming messages if needed
            });

            ws.on('close', () => {
                // console.log(`User ${userId} disconnected`);
                this.clients.delete(userId + '-' + roomId);
            });
        });
    }

    public async sendToUser(roomId: string, data: ChatMessageStruct, st?: MessageStatus) {
        let msg = false, contact = false;
        // receiver socket
        const socket = this.clients.get(data.receiverId + '-' + roomId);
        if (socket && socket.readyState === WebSocket.OPEN) {
            msg = true;
            socket.send(JSON.stringify({ ...data, status: MessageStatus.SEEN }));
            Container.get(ChatService).updateMsgStatus(data.uniqueId, MessageStatus.SEEN);
        } else {
            const a: boolean = await Container.get(WebSocketContact).sendContactToUser(data.receiverId, data);
            if (a) {
                contact = true;
            } else if (!st) {
                const recei = await Container.get(UserService).getUsersBasedOnFilter({ uniqueId: data.receiverId });
                const sender = await Container.get(UserService).getUsersBasedOnFilter({ uniqueId: data.senderId });
                const room = await Container.get(ChatService).getRoomById(data.roomId);
                if (typeof recei.message == 'object' && typeof sender.message == 'object' && typeof room.message == 'object') {
                    await Container.get(FirebaseService).sendNotification({
                        fcmToken: recei.message.mobileToken,
                        title: `New Message from ${sender.message.name}`,
                        body: data.message,
                        type: NotificationType.CHAT,
                        senderId: sender.message.uniqueId,
                        pId: room.message.propertyId,
                        receiverId: recei.message.uniqueId
                    });
                }
            }
        }
        // sender socket
        const socket1 = this.clients.get(data.senderId + '-' + roomId);
        if (socket1 && socket1.readyState === WebSocket.OPEN) {
            socket1.send(JSON.stringify({ ...data, status: st ? st : msg ? MessageStatus.SEEN : contact ? MessageStatus.DELIVERED : MessageStatus.SENT }));
        }
    }

    public async prodcastMessage(data: ChatMessageStruct, st?: MessageStatus) {
        this.sendToUser(data.roomId, data, st);
    }

    // private watchMongoCollection(): void {
    //     const changeStream = this.ChatMessageModel.watch();

    //     changeStream.on('change', (change: any) => {
    //         const updatedFields = change?.updateDescription?.updatedFields || {};

    //         const receiverId = updatedFields?.receiverId;
    //         if (receiverId) {
    //             this.sendToUser(receiverId, {
    //                 type: 'db-update',
    //                 payload: updatedFields
    //             });
    //         }
    //     });

    //     process.on('SIGINT', async () => {
    //         await changeStream.close();
    //         process.exit(0);
    //     });
    // }
}
