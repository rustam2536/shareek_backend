import { CommentsStruct, ReplyBy } from '@/interfaces/comments';
import mongoose from 'mongoose';

const CoomentsSchema = new mongoose.Schema({
    uniqueId: { type: String, required: true },
    propertyId: { type: String, required: true },
    text: { type: String, required: true },
    userId: { type: String, required: true },
    isApproved: { type: Boolean, default: true },
    isAnonymous: { type: Boolean, default: false },
    commentBy: { type: String, default: ReplyBy.USER, enum: [...Object.values(ReplyBy)] },
    reply: {
        text: { type: String },
        replyBy: { type: String, enum: [...Object.values(ReplyBy)] },
        replier: { type: String },
        replyAt: { type: String },
    }
}, {
    timestamps: true
});

export default mongoose.model<CommentsStruct & mongoose.Document>('Comments', CoomentsSchema);