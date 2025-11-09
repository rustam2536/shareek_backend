import { CategoryStruct, CategoryNames } from '@/interfaces/category';
import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        enum: Object.values(CategoryNames)
    },
    nameArabic: {
        type: String
    },
    icon: { type: String, required: true },
    forSell: { type: Boolean, required: true },
    forRent: { type: Boolean, required: true },
    uniqueId: { type: String, required: true },
    description: {
        type: String
    }
}, {
    timestamps: true
});

export default mongoose.model<CategoryStruct & mongoose.Document>('Category', CategorySchema);
