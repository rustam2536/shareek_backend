import { Furnishing, ListedBy, ProjectStatus, PropertyPurpose, PropertyStatus, PropertyStruct, StreetDirection } from '@/interfaces/property';
import mongoose from 'mongoose';

const PropertySchema = new mongoose.Schema({
    uniqueId: { type: String, required: true },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    projectName: { type: String, required: true },
    listedBy: { type: ListedBy, default: ListedBy.OWNER },
    furnishing: { type: String, default: "" },
    streetDirection: { type: StreetDirection, default: StreetDirection.SOUTH },
    propertyArea: { type: String, default: "" },
    propertyWidth: { type: String, default: "" },
    propertyDepth: { type: String, default: "" },
    streetWidth: { type: String, default: "" },
    titleArabic: { type: String, default: "" },
    descriptionArabic: { type: String, default: "" },
    price: { type: String, required: true },
    isFeatured: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    for: { type: String, enum: Object.values(PropertyPurpose), required: true },
    sellerId: { type: String, required: true },

    categoryId: { type: String, required: true },
    isSold: { type: Boolean, default: false },

    location: {
        address: { type: String, default: "" },
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        iso2Code: { type: String, default: "" },
        country: { type: String, default: "" },
        longitude: { type: Number, default: 0 },
        latitude: { type: Number, default: 0 },
        geo: {
            type: {
                type: String,
                enum: ['Point'],
                required: true,
            },
            coordinates: {
                type: [Number],
                required: true,
                index: '2dsphere'  // ✅ Add this
            }
        }
    },

    features: {
        bedRooms: { type: Number, default: 0 },
        floorNo: { type: Number, default: 0 },
        livingRooms: { type: Number, default: 0 },
        bathRooms: { type: Number, default: 0 },
        kitchen: { type: Boolean, default: false },
        driverRoom: { type: Boolean, default: false },
        maidRoom: { type: Boolean, default: false },
        pool: { type: Boolean, default: false },
        basement: { type: Boolean, default: false },
        totalFloors: { type: Number, default: 0 },
        carParking: { type: Number, default: 0 },
        internalStair: { type: Boolean, default: false },
        lift: { type: Boolean, default: false },
        drainageAvailability: { type: Boolean, default: false },
        waterAvailability: { type: Boolean, default: false },
        electricalAvailability: { type: Boolean, default: false },
        network4g: { type: Boolean, default: false },
        network5g: { type: Boolean, default: false },
    },

    images: [String],
    videos: {
        fileName: { type: String },
        showInReels: { type: Boolean }
    },

    status: {
        type: String,
        enum: Object.values(PropertyStatus),
        default: PropertyStatus.INCOMPLETE
    },
    projectStatus: {
        type: String,
        // enum: Object.values(ProjectStatus),
        default: ""
    },

    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    expiresAt: Date
}, {
    timestamps: true
});

export default mongoose.model<PropertyStruct & mongoose.Document>('Property', PropertySchema);
