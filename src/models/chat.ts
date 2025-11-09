import { ChatStruct, ChatType, MessageStatus, MessageType } from "@/interfaces/chat";
import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
    chatId: { type: String, required: true },
    roomId: { type: String, required: true },
    type: { type: String, required: true }, // Participants
    userId: { type: String, required: true }, // Owner of this session (buyer or seller)
    isImp: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
}, {
    timestamps: true
});

// ChatSchema.index({ sellerId: 1, receiverId: 1, propertyId: 1 }, { unique: true });

export default mongoose.model<ChatStruct & mongoose.Document>('Chat', ChatSchema);
