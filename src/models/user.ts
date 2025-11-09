import { IUser, UserRole } from '@/interfaces/IUser';
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  countryCode: { type: String, required: true },
  uniqueId: { type: String, required: true },
  status: { type: Boolean, required: true },
  isVerified: { type: Boolean, default: false },
  blocked: { type: Boolean, required: true },
  email: { type: String, default: "" },
  password: { type: String, required: true },
  salt: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.USER },
  whatsapp: { type: String, default: "" },
  profile: { type: String, default: "" },
  adId: { type: String, default: "" },
  expiryDate: { type: String, default: "" },
  mobileToken: { type: String, default: "" },
  wishlist: { type: [String], default: [] },
  blockedUsers: { type: [String], default: [] },
}, {
  timestamps: true
});

export default mongoose.model<IUser & mongoose.Document>('User', UserSchema);
