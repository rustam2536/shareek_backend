import { ReportAdsStruct, ReportOptions } from '@/interfaces/reportAds';
import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
    uniqueId: { type: String, required: true },
    propertyId: { type: String, required: true },
    userId: { type: String, required: true },
    remark: { type: String, required: true },
    option: { type: String, required: true, enum: [...Object.values(ReportOptions)] },
}, {
    timestamps: true
});

export default mongoose.model<ReportAdsStruct & mongoose.Document>('ReportAds', ReportSchema);