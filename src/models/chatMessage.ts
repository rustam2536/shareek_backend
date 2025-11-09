import mongoose from 'mongoose';
import { ChatMessageStruct, ChatStruct, MessageStatus, MessageType } from '@/interfaces/chat'; // e.g., SENT, TEXT, etc.

const ChatMessageSchema = new mongoose.Schema({
    uniqueId: { type: String, required: true },
    roomId: { type: String, required: true },

    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },

    message: { type: String, required: true },
    status: {
        type: String, required: true, default: MessageStatus.PENDING,
        enum: Object.values(MessageStatus),
    },
    type: { type: String, required: true, enum: Object.values(MessageType) },

}, {
    timestamps: true
});

ChatMessageSchema.index({ roomId: 1, createdAt: -1 });

export default mongoose.model<ChatMessageStruct & mongoose.Document>('ChatMessage', ChatMessageSchema);
