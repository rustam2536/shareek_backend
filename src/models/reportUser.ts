import { ReportUserStruct } from '@/interfaces/reportUser';
import mongoose from 'mongoose';

const reportUser = new mongoose.Schema({
    uniqueId: { type: String, required: true },
    userId: { type: String, required: true },
    reporterId: { type: String, required: true },
    remark: { type: String, default: "" },
    chats: { type: String, default: "" },
}, {
    timestamps: true
});

export default mongoose.model<ReportUserStruct & mongoose.Document>('ReportUser', reportUser);