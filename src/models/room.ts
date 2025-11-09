import { RoomStruct } from "@/interfaces/chat";
import mongoose from 'mongoose';

const Schema = new mongoose.Schema({
    roomId: { type: String, required: true },
    isBlocked: { type: Boolean, required: true },
    blockedBy: { type: String, default: "" },
    userId1: { type: String, required: true },
    userId2: { type: String, required: true },
    sellerId: { type: String, required: true },
    propertyId: { type: String, required: true }
}, {
    timestamps: true
});

Schema.index({ userId1: 1, userId2: 1, propertyId: 1 }, { unique: true });

export default mongoose.model<RoomStruct & mongoose.Document>('Room', Schema);
