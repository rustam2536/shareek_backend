import { NotificationStruct, NotificationType } from '@/interfaces/notification';
import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
    uniqueId: { type: String, required: true },
    userId: { type: String, default: "" },
    title: { type: String, required: true },
    body: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
    type: { type: String, enum: Object.values(NotificationType), default: NotificationType.CHAT },
    seen: { type: Boolean, default: false },
}, {
    timestamps: true
});

export default mongoose.model<NotificationStruct & mongoose.Document>('Notification', NotificationSchema);

