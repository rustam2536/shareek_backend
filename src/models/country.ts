import { CountryStruct } from '@/interfaces/country';
import mongoose from 'mongoose';

const CountrySchema = new mongoose.Schema({
    uniqueId: { type: String, required: true },
    name: { type: String, required: true },
    icon: { type: String, required: true },
    code: { type: String, required: true },
    isoCode: { type: String, default: "" },
    iso2code: { type: String, default: "" },
    isAllowed: { type: Boolean, default: false }
}, {
    timestamps: true
});

export default mongoose.model<CountryStruct & mongoose.Document>('Countries', CountrySchema);
