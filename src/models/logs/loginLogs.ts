import { LoginLogs } from "@/interfaces/logs/loginLogs";
import mongoose from "mongoose";

const Logs = new mongoose.Schema(
  {
    ip: {type: String},
    os: {type: String},
    lat: {type: String},
    long: {type: String},
    country: {type: String},
    city: {type: String},
    timezone: {type: String},
    browser: {type: String},
    loginTime: {type: Number,default: 0},
    logoutTime: {type: Number, default: 0},
    status: {type: String},
    createdAt: {type: Number},
    message: {type: String, required: true},
    salt: {type: String, required: true},
    userId: {type: String, required: true},
    uniqueId: {type: String, required: true},
  }, { timestamps: true }
);

export default mongoose.model<LoginLogs & mongoose.Document>('loginLogs', Logs);
