import Container, { Service } from 'typedi';
import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { ChatMessageStruct, ChatStruct, MessageStatus } from '@/interfaces/chat';
import ChatService from '@/services/chatService';

@Service()
export class WebSocketContact {
    private wss: WebSocketServer;
    private clients: Map<string, WebSocket> = new Map(); // Map of userId -> WebSocket

    constructor(
        // @Inject('chatMessageModel') private ChatMessageModel: Model<any>,
    ) { }

    public init(): void {
        // this.wss = new WebSocket.Server({ server: server, path: "/contact" });
        this.wss = new WebSocket.Server({ port: 5002 });
        this.mainSocket();
    }

    private mainSocket(): void {
        this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
            // Parse user ID from query param (e.g. ws://localhost:3000/socket?userId=123)
            const params = new URLSearchParams(req.url?.split('?')[1]);
            const userId = params.get('userId');

            if (!userId) {
                ws.close(1008, 'Missing userId');
                return;
            }

            this.clients.set(userId, ws);

            ws.on('message', (msg) => {
            });

            ws.on('close', () => {
                this.clients.delete(userId);
            });
        });
    }

    public async sendContactToUser(userId: string, data: ChatMessageStruct)
        : Promise<boolean> {
        const socket = this.clients.get(userId);
        if (socket && socket.readyState === WebSocket.OPEN) {

            const chat: { message: string | ChatStruct; flag: boolean } = await Container.get(ChatService)
                .getChatById(data.roomId, userId);

            if (chat.flag) {
                Container.get(ChatService).updateMsgStatus(data.uniqueId, MessageStatus.DELIVERED);

                // const obj = {
                //     ...(chat.message as ChatStruct),
                //     "message": { ...data, status: MessageStatus.DELIVERED }
                // }
                socket.send(JSON.stringify(chat.message));
                return true;
            }
        }
        return false;
    }
}
