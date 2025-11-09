import { CitiesStruct } from '@/interfaces/cities';
import mongoose from 'mongoose';

const CitySchema = new mongoose.Schema({
    uniqueId: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String },
    countryCode: { type: String },
    region: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
}, {
    timestamps: true
});

export default mongoose.model<CitiesStruct & mongoose.Document>('Cities', CitySchema);
