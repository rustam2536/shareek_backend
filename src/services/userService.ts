import { Container, Inject, Service } from "typedi";
import { Request, Response } from "express";
import { IUser, LoginStatus, UserRole } from "@/interfaces/IUser";
import crypto from "crypto";
import Common from "@/services/commonService";
import { LoginLogs } from "@/interfaces/logs/loginLogs";
import LoginLogsService from "./logs/loginLogsService";
import PropertyService from "./propertyService";
import { PropertyStatus } from "@/interfaces/property";
import fs from "fs";
import path from "path";


@Service()
export default class UserService {

    constructor(
        @Inject('logger') private logger,
        @Inject('userModel') private UserModel: Models.UserModel,
        @Inject('citiesModel') private City: Models.CitiesModel
    ) {
    }

    public async createUser(req: Request, res: Response)
        : Promise<{ message: string | object, flag: boolean }> {
        try {
            const { phone, otp } = req.body;

            let user: IUser = await this.UserModel.findOne({ phone: phone });
            if (user?.phone) {
                return { message: "User already exist, Please login.", flag: false };
            }

            if (!otp) {
                return { message: "Otp sent successfully.", flag: true };
            } else if (otp !== '123456') {
                return { message: "Wrong otp.", flag: false };
            }

            let salt = crypto.randomBytes(16).toString('hex');
            let hash = crypto.pbkdf2Sync(req.body.password, salt,
                1000, 64, `sha512`).toString(`hex`);

            if (req.body.adId) {
                if (!req.body.expiryDate) {
                    return { message: "Expiry date is required.", flag: false };
                }
                if (new Date(req.body.expiryDate) <= new Date()) {
                    return { message: "Date is expiried.", flag: false };
                }
            }
            let userObj: IUser = {
                name: req.body.name,
                phone: phone,
                salt: salt,
                role: UserRole.USER,
                uniqueId: Container.get(Common).generateUniqueID(process.env.USER_PREFIX),
                countryCode: req.body.countryCode,
                status: true,
                blocked: false,
                email: req.body.email || "",
                password: hash,
                whatsapp: req.body.whatsapp || "",
                profile: req.body.profile || "",
                wishlist: [],
                isVerified: false,
                blockedUsers: [],
                adId: req.body.adId || "",
                expiryDate: req.body.expiryDate || "",
                mobileToken: ""
            };

            const createdUser: IUser = await this.UserModel.create(userObj) as IUser;
            if (!createdUser?.uniqueId) {
                this.logger.error("Failed to create User.");
                return { message: "Failed to create User.", flag: false };
            }

            let loginStatus = LoginStatus.SUCCESS;
            let message = 'Login Successfull.';

            let createdLogs: { message: string | LoginLogs, flag: boolean } = await Container.get(LoginLogsService)
                .createLog(req, res,
                    {
                        user: createdUser, message: message,
                        status: loginStatus
                    });

            if (!createdLogs.flag) {
                return { message: createdLogs.message.toString(), flag: false }
            }

            if (createdLogs.flag && typeof createdLogs.message === "object") {
                req['uniqueLogId'] = createdLogs.message.uniqueId;
                req['loginStatus'] = createdLogs.message.status;
                req['loginSalt'] = createdLogs.message.salt;
            } else {
                return { message: createdLogs.message.toString(), flag: false };
            }

            let obj = {
                name: createdUser.name,
                token: Container.get(Common).generateJSONToken(createdUser, req['loginSalt']),
                sessionId: req['uniqueLogId'],
                status: req['loginStatus'],
                role: createdUser.role,
                uniqueId: createdUser.uniqueId,
                loggedTime: createdLogs.message['createdAt'],
            };

            return { message: obj, flag: true }
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async loginUser(req: Request, res: Response)
        : Promise<{ message: string | object, flag: boolean }> {
        try {
            const { phone } = req.body;

            let user: IUser = await this.UserModel.findOne({ phone: phone });
            if (!user?.phone) {
                return { message: "User not found, Please sign up first.", flag: false };
            }

            if (user.blocked) {
                this.logger.error(`User is blocked.`);
                return { message: 'User has been blocked.', flag: false };
            }
            if (!user.status) {
                this.logger.error(`User is not active.`);
                return { message: 'Please verify your phone first.', flag: false };
            }

            let logs: { message: string | LoginLogs, flag: boolean } = await Container.get(LoginLogsService)
                .createLogsAndLogin(req, res, user);

            if (logs.flag && typeof logs.message === "object") {
                req['uniqueLogId'] = req.body.uniqueLogId ? req.body.uniqueLogId : logs.message.uniqueId;
                req['loginStatus'] = logs.message.status;
                req['loginSalt'] = logs.message.salt;
            } else {
                return { message: logs.message, flag: false };
            }

            let obj = {
                name: user.name,
                token: Container.get(Common).generateJSONToken(user, req['loginSalt']),
                sessionId: req['uniqueLogId'],
                status: req['loginStatus'],
                role: user.role,
                uniqueId: user.uniqueId,
                loggedTime: logs.message['createdAt'],
                isVerified: user.isVerified
            };

            return { flag: true, message: obj }
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async changePassword(req: Request, res: Response)
        : Promise<{ message: string | object, flag: boolean }> {
        try {
            const { oldPassword, newPassword } = req.body;

            const user: IUser | null = await this.UserModel.findOne({ uniqueId: req['userId'] });
            if (!user) {
                return { message: "User not found, Please sign up first.", flag: false };
            }

            // Compare old password with stored hash
            let hash = crypto.pbkdf2Sync(oldPassword, user.salt, 1000,
                64, `sha512`).toString(`hex`);
            if (hash !== user.password) {
                return { message: 'Old password is incorrect.', flag: false };
            }

            // Hash and update the new password
            let salt = crypto.randomBytes(16).toString('hex');
            let newPass = crypto.pbkdf2Sync(newPassword, salt,
                1000, 64, `sha512`).toString(`hex`);

            const userUpdated: IUser | null = await this.UserModel.findOneAndUpdate({ uniqueId: req['userId'] }, {
                $set: { salt: salt, password: newPass }
            }, { new: true });

            if (!userUpdated) {
                return { message: "Failed to update user.", flag: false };
            }

            await Container.get(LoginLogsService).logoutAllDevices({ userId: req['userId'] });

            return {
                flag: true,
                message: "Password changed successfully.",
            };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async forgotPassword(req: Request, res: Response)
        : Promise<{ message: string | object, flag: boolean }> {
        try {
            const { phone, otp, password } = req.body;

            const user: IUser | null = await this.UserModel.findOne({ phone: phone });
            if (!user) {
                return { message: "User not found, Please sign up first.", flag: false };
            }

            if (!otp) {
                return { message: "Otp sent successfully.", flag: true };
            } else if (otp !== '123456') {
                return { message: "Wrong otp.", flag: false };
            }

            if (!password) {
                return { message: "Password can't be empty.", flag: false };
            }

            // Hash and update the new password
            let salt = crypto.randomBytes(16).toString('hex');
            let newPass = crypto.pbkdf2Sync(password, salt,
                1000, 64, `sha512`).toString(`hex`);

            const userUpdated: IUser | null = await this.UserModel.findOneAndUpdate({ phone: phone }, {
                $set: { salt: salt, password: newPass }
            }, { new: true });

            if (!userUpdated) {
                return { message: "Failed to update user.", flag: false };
            }

            await Container.get(LoginLogsService).logoutAllDevices({ userId: req['userId'] });

            return {
                flag: true,
                message: "Password changed successfully.",
            };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getUserDetails(req: Request, res: Response):
        Promise<{ message: string | IUser, flag: boolean }> {
        try {
            // this.logger.info(`Calling Get user details...`);
            let user: IUser = await this.UserModel.findOne({ uniqueId: req['userId'] }) as IUser;
            if (!user?.uniqueId) {
                this.logger.error(`Failed to get user details.`);
                return { message: "Failed to get user details.", flag: false };
            }

            const userObjCleaned = (user as any).toObject(); // Converts to plain JS object
            delete userObjCleaned.salt;
            delete userObjCleaned.password;
            return { message: userObjCleaned, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getUsersBasedOnFilter(filters: { uniqueId: string }):
        Promise<{ message: string | IUser, flag: boolean }> {
        try {
            let users: IUser = await this.UserModel.findOne({ uniqueId: filters.uniqueId }) as IUser;
            if (!users?.uniqueId) {
                this.logger.error("No users found.");
                return { message: "No users found.", flag: false };
            }
            return { message: users, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getAllUsers(req: Request, res: Response)
        : Promise<{ message: string | { data: IUser[], totalCount: number }, flag: boolean }> {
        try {
            let aggregate = [];
            let { page, searchTerm } = req.query;
            let obj = {
                $facet: {
                    totalCount: [
                        {
                            $count: "count"
                        },
                        {
                            $project: { _id: 0, count: 1 }
                        }
                    ],
                    data: []
                }
            };

            let matchObj = {
                $match: {
                    $or: [],
                    role: UserRole.USER
                }
            };

            if (searchTerm) {
                matchObj.$match.$or.push({ name: { $regex: searchTerm, $options: 'i' } },
                    { name: { $regex: searchTerm, $options: 'i' } },
                    { email: { $regex: searchTerm, $options: 'i' } },
                    { phone: { $regex: searchTerm, $options: 'i' } },
                    { uniqueId: { $regex: searchTerm, $options: 'i' } },
                );
            } else {
                delete matchObj.$match.$or;
            }
            obj.$facet.data.push(matchObj);
            // @ts-ignore
            obj.$facet.totalCount.splice(0, 0, matchObj);

            const projectStage = {
                $project: {
                    password: 0,
                    salt: 0
                }
            };

            // Exclude password and salt fields
            obj.$facet.data.push(projectStage);

            if (+page < 1) {
                obj.$facet.data.push({ $sort: { createdAt: -1 } });
            } else {
                let skip = (+page - 1) * +process.env.LIMIT;
                obj.$facet.data.push({ $sort: { createdAt: -1 } });
                obj.$facet.data.push({ $skip: skip });
                obj.$facet.data.push({ $limit: +process.env.LIMIT });
            }
            aggregate.push(obj);

            let query = await this.UserModel.aggregate(aggregate);
            if (query.length === 0) {
                return { message: { data: [], totalCount: 0 }, flag: true };
            }
            let result = query[0];

            return {
                message: {
                    data: result["data"],
                    totalCount: result["totalCount"].length === 0 ? 0 : result["totalCount"][0].count
                }, flag: true
            };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getAllUsersPhone(req: Request, res: Response)
        : Promise<{ message: string | string[], flag: boolean }> {
        try {
            let query = await this.UserModel.aggregate([
                {
                    $project: {
                        _id: 0,
                        mobileToken: 1,
                        phone: 1,
                        uniqueId: 1,
                    }
                }
            ]);

            return { message: query, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async updateBlockedUser(filters: { id: string, blocked: boolean }):
        Promise<{ message: string | IUser, flag: boolean }> {
        try {
            let users: IUser = await this.UserModel.findOneAndUpdate({ uniqueId: filters.id },
                { $set: { blocked: filters.blocked } }, { new: true }) as IUser;
            if (users.blocked !== filters.blocked) {
                this.logger.error("Failed to update user.");
                return { message: "Failed to update user.", flag: false };
            }
            return { message: users, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async updateUserDetails(req: Request, res: Response):
        Promise<{ message: string | IUser, flag: boolean }> {
        try {
            const { uniqueId, ...obj } = req.body;
            let user: IUser = await this.UserModel.findOne({ uniqueId: uniqueId || req['userId'] }) as IUser;
            if (!user) {
                return { message: "Invalid Id.", flag: false };
            }
            if (obj.adId) {
                if (user.isVerified && new Date(user.expiryDate) > new Date()) {
                    return { message: "Cann't change Ad Id right now.", flag: false };
                }
                if (!obj.expiryDate) {
                    return { message: "Expiry date is required.", flag: false };
                }
                if (new Date(obj.expiryDate) <= new Date()) {
                    return { message: "Date is expired.", flag: false };
                }
            }
            let users: IUser = await this.UserModel.findOneAndUpdate({ uniqueId: uniqueId || req['userId'] },
                { $set: obj }, { new: true }) as IUser;

            const userObjCleaned = (users as any).toObject(); // Converts to plain JS object
            delete userObjCleaned.salt;
            delete userObjCleaned.password;
            return { message: userObjCleaned, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async addWishlist(req: Request, res: Response):
        Promise<{ message: string, flag: boolean }> {
        try {
            const { propertyId } = req.body;

            const property = await Container.get(PropertyService)
                .getSingleProperty({ uniqueId: propertyId, status: PropertyStatus.ACTIVE });
            if (!property.flag) {
                return { message: property.message.toString(), flag: false };
            }

            const user = await this.UserModel.findOne({ uniqueId: req['userId'] });

            // Avoid duplicates
            if (user.wishlist.includes(propertyId)) {
                return { message: "Already added.", flag: true };
            }

            let users = await this.UserModel.findOneAndUpdate({ uniqueId: req['userId'] },
                { $push: { wishlist: propertyId } }, { new: true }) as IUser;

            await Container.get(PropertyService)
                .incrementLike({ uniqueId: propertyId });

            return { message: "Added successfully.", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async removeWishlist(req: Request, res: Response):
        Promise<{ message: string, flag: boolean }> {
        try {
            const { propertyId } = req.body;

            const property = await Container.get(PropertyService)
                .getSingleProperty({ uniqueId: propertyId, status: PropertyStatus.ACTIVE });
            if (!property.flag) {
                return { message: property.message.toString(), flag: false };
            }

            const user = await this.UserModel.findOne({ uniqueId: req['userId'] });
            if (!user || !user.wishlist.includes(propertyId)) {
                return { message: "Property is not in the wishlist", flag: true };
            }

            const users = await this.UserModel.findOneAndUpdate(
                { uniqueId: req['userId'] },
                { $pull: { wishlist: propertyId } },
                { new: true }
            ) as IUser;

            await Container.get(PropertyService)
                .decrementLike({ uniqueId: propertyId });

            return { message: "Removed successfully.", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async addBlockedUsers(req: Request, res: Response):
        Promise<{ message: string, flag: boolean }> {
        try {
            const { userId } = req.body;

            const user = await this.UserModel.findOne({ uniqueId: req['userId'] });
            const userR = await this.UserModel.findOne({ uniqueId: userId });
            if (!userR?.uniqueId) {
                return { message: "User id is not valid.", flag: false };
            }

            // Avoid duplicates
            if (user.blockedUsers.includes(userId)) {
                return { message: "Already added.", flag: true };
            }

            let users = await this.UserModel.findOneAndUpdate({ uniqueId: req['userId'] },
                { $push: { blockedUsers: userId } }, { new: true }) as IUser;

            return { message: "Added successfully.", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async blockUser(req: Request, res: Response):
        Promise<{ message: string, flag: boolean }> {
        try {
            const { userId, block } = req.body;

            const userR = await this.UserModel.findOne({ uniqueId: userId });
            if (!userR?.uniqueId) {
                return { message: "User id is not valid.", flag: false };
            }

            let users = await this.UserModel.findOneAndUpdate({ uniqueId: userId },
                { $set: { blocked: block } }, { new: true }) as IUser;

            return { message: block ? "Blocked Successfully." : "UnBlocked successfully", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async logoutUser(req: Request, res: Response):
        Promise<{ message: string, flag: boolean }> {
        try {
            const logout = await Container.get(LoginLogsService)
                .logoutDevices(req, res);

            if (!logout.flag) {
                return { message: "Logout failed.", flag: false };
            }

            return { message: "Logout success.", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getSellerDetails(req: Request, res: Response):
        Promise<{ message: string | IUser, flag: boolean }> {
        try {
            const { uniqueId } = req.query;

            let aggregate = [
                {
                    $match: {
                        uniqueId: uniqueId
                    }
                },
                {
                    $lookup: {
                        from: "properties",
                        let: { sellerId: "$uniqueId" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$sellerId", "$$sellerId"] },
                                        ]
                                    }
                                }
                            },
                            { $sort: { createdAt: -1 } },
                            {
                                $lookup: {
                                    from: "categories",
                                    let: { catId: "$categoryId" },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: { $eq: ["$uniqueId", "$$catId"] }
                                            }
                                        },
                                        {
                                            $project: {
                                                name: 1,
                                                nameArabic: 1,
                                                _id: 0
                                            }
                                        }
                                    ],
                                    as: "category"
                                }
                            },
                            {
                                $unwind: "$category",
                            },
                            {
                                $project: {
                                    title: 1,
                                    titleArabic: 1,
                                    address: "$location.address",
                                    price: 1,
                                    images: { $arrayElemAt: ["$images", 0] },
                                    uniqueId: 1,
                                    for: 1,
                                    status: 1,
                                    category: 1,
                                }
                            }
                        ],
                        as: "properties"
                    }
                },
                {
                    $addFields: {
                        properties: {
                            $map: {
                                input: "$properties",
                                as: "prop",
                                in: {
                                    $mergeObjects: [
                                        "$$prop",
                                        {
                                            isWishlist: {
                                                $in: ["$$prop.uniqueId", "$wishlist"]
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        name: 1,
                        properties: 1,
                        createdAt: 1,
                        profile: 1,
                        isVerified: 1,
                    }
                }
            ];

            const query = await this.UserModel.aggregate(aggregate);

            return { message: query[0], flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getOwnerDetails(req: Request, res: Response):
        Promise<{ message: string | IUser, flag: boolean }> {
        try {
            const { uniqueId } = req.query;

            let aggregate = [
                {
                    $match: {
                        uniqueId: uniqueId
                    }
                },
                {
                    $lookup: {
                        from: "properties",
                        let: { sellerId: "$uniqueId" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$sellerId", "$$sellerId"] },
                                            { $eq: ["$status", PropertyStatus.ACTIVE] }
                                        ]
                                    }
                                }
                            },
                            { $sort: { createdAt: -1 } },
                            {
                                $limit: 6
                            },
                            {
                                $lookup: {
                                    from: "categories",
                                    let: { catId: "$categoryId" },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: { $eq: ["$uniqueId", "$$catId"] }
                                            }
                                        },
                                        {
                                            $project: {
                                                name: 1,
                                                nameArabic: 1,
                                                _id: 0
                                            }
                                        }
                                    ],
                                    as: "category"
                                }
                            },
                            {
                                $unwind: "$category",
                            },
                            {
                                $project: {
                                    title: 1,
                                    titleArabic: 1,
                                    address: "$location.address",
                                    price: 1,
                                    images: { $arrayElemAt: ["$images", 0] },
                                    uniqueId: 1,
                                    for: 1,
                                    category: 1,
                                }
                            }
                        ],
                        as: "properties"
                    }
                },
                {
                    $addFields: {
                        properties: {
                            $map: {
                                input: "$properties",
                                as: "prop",
                                in: {
                                    $mergeObjects: [
                                        "$$prop",
                                        {
                                            isWishlist: {
                                                $in: ["$$prop.uniqueId", "$wishlist"]
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        name: 1,
                        properties: 1,
                        createdAt: 1,
                        profile: 1,
                        isVerified: 1,
                    }
                }
            ];

            const query = await this.UserModel.aggregate(aggregate);

            return { message: query[0], flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getMySavedAds(req: Request, res: Response):
        Promise<{ message: string | any, flag: boolean }> {
        try {
            let aggregate = [
                {
                    $match: {
                        uniqueId: req['userId']
                    }
                },
                {
                    $lookup: {
                        from: "properties",
                        let: { wishlist: "$wishlist" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $in: ["$uniqueId", "$$wishlist"] },
                                            { $eq: ["$status", PropertyStatus.ACTIVE] }
                                        ]
                                    }
                                }
                            },
                            { $sort: { createdAt: -1 } },
                            {
                                $lookup: {
                                    from: "categories",
                                    let: { catId: "$categoryId" },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: { $eq: ["$uniqueId", "$$catId"] }
                                            }
                                        },
                                        {
                                            $project: {
                                                name: 1,
                                                nameArabic: 1,
                                                _id: 0
                                            }
                                        }
                                    ],
                                    as: "category"
                                }
                            },
                            {
                                $unwind: "$category",
                            },
                            {
                                $project: {
                                    title: 1,
                                    titleArabic: 1,
                                    address: "$location.address",
                                    price: 1,
                                    images: { $arrayElemAt: ["$images", 0] },
                                    uniqueId: 1,
                                    for: 1,
                                    category: 1,
                                }
                            }
                        ],
                        as: "properties"
                    }
                },
                {
                    $unwind: "$properties"
                },
                {
                    $replaceRoot: { newRoot: "$properties" }
                }
            ];

            const query = await this.UserModel.aggregate(aggregate);

            return { message: query, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async clearWishlist(req: Request, res: Response):
        Promise<{ message: string, flag: boolean }> {
        try {
            await this.UserModel.findOneAndUpdate({ uniqueId: req['userId'] }, {
                $set: {
                    wishlist: []
                }
            }, { new: true });

            return { message: "Wishlist cleared.", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async updateDetails(filters: { id: string, token: string }):
        Promise<{ message: string | IUser, flag: boolean }> {
        try {
            await this.UserModel.findOneAndUpdate({ uniqueId: filters.id },
                { $set: { mobileToken: filters.token } }, { new: true }) as IUser;

            return { message: "Token updated.", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

}