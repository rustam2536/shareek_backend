import { Container, Inject, Service } from "typedi";
import { Request, Response } from "express";
import Common from "@/services/commonService";
import { PropertyInputDTO, PropertyStatus, PropertyStruct, SortBy, zoomLevelToDistance } from "@/interfaces/property";
import CategoryService from "./categoryService";
import { CategoryStruct } from "@/interfaces/category";
import { IUser, UserRole } from "@/interfaces/IUser";
import UserService from "./userService";
import { CitiesStruct } from "@/interfaces/cities";
import path from "path";
import fs from "fs";
import FirebaseService from "./firebaseService";
import { NotificationType } from "@/interfaces/notification";
import CountryService from "./countryService";
import { CountryStruct } from "@/interfaces/country";

@Service()
export default class PropertyService {

    constructor(
        @Inject('logger') private logger,
        @Inject('propertyModel') private PropertyModel: Models.PropertyModel,
        @Inject('citiesModel') private CitiesModel: Models.CitiesModel
    ) {
    }

    public isEnglish(text: string): boolean {
        const regex = /[a-zA-Z]/;
        return regex.test(text);
    }

    public async createProperty(req: Request, res: Response)
        : Promise<{ message: string | PropertyStruct, flag: boolean }> {
        try {
            const user: { message: string | IUser, flag: boolean } = await Container.get(UserService)
                .getUserDetails(req, res);
            if (typeof user.message === 'object') {
                if (user.message.countryCode == '966') {
                    if (!user.message.adId) {
                        return { message: "Please add Ad ID fist to list property.", flag: false };
                    }
                    if (new Date(user.message.expiryDate) <= new Date()) {
                        return { message: "Ad ID expired.", flag: false };
                    }
                    if (!user.message.isVerified) {
                        return { message: "Ad ID is not approved yet.", flag: false };
                    }
                }
            }
            const { categoryId, description, title } = req.body;
            const category: { message: string | CategoryStruct, flag: boolean } = await Container.get(CategoryService)
                .getCategoryBasedOnFilter({
                    uniqueId: categoryId
                });
            if (!category.flag) {
                return { message: category.message.toString(), flag: false };
            }

            let a = '', b = '', c = '', d = '';
            if (this.isEnglish(title)) {
                a = title;
                b = description;
            } else {
                c = title;
                d = description;
            }

            const countryData = await Container.get(CountryService)
                .getSingleCountry(req.body.location.country);

            if (!countryData.flag) {
                return { message: countryData.message.toString(), flag: false };
            }
            if (!(countryData.message as CountryStruct).isAllowed) {
                return { message: 'Country is not allowed', flag: false };
            }

            const obj: PropertyStruct = {
                ...req.body,
                uniqueId: Container.get(Common).generateUniqueID(process.env.PROPERTY_PREFIX),
                sellerId: req['userId'],
                isFeatured: false,
                title: a,
                location: {
                    ...req.body.location,
                    geo: {
                        type: "Point",
                        coordinates: [
                            parseFloat(req.body.location.longitude),
                            parseFloat(req.body.location.latitude)
                        ]
                    }
                },
                description: b,
                likes: 0,
                titleArabic: c,
                isDeleted: false,
                descriptionArabic: d,
                images: req.body.images ?? [],
                videos: {
                    fileName: req.body.videos ?? "",
                    showInReels: false
                },
                status: PropertyStatus.INCOMPLETE,
                views: 0,
                expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : new Date(new Date().setFullYear(new Date().getFullYear() + 1))
            };

            const entry: PropertyStruct = await this.PropertyModel.create(obj);
            if (!entry?.uniqueId) {
                this.logger.error("Failed to create property.");
                return { message: "Failed to create property.", flag: false };
            }

            return { message: entry, flag: true }
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    // public async ciy(req: Request, res: Response)
    //     : Promise<{ message: string | any, flag: boolean }> {
    //     try {

    //         const formattedCities = citiesData.map(city => ({
    //             uniqueId: `${city.city_id}-${city.region_id}`,
    //             city: city.name_en,
    //             region: String(city.region_id),
    //             latitude: city.center[0],
    //             longitude: city.center[1],
    //             country: "Saudi Arabia",        // optional or dynamic
    //             countryCode: "SA",              // optional or dynamic
    //         }));

    //         for (const el of formattedCities) {
    //             await this.CitiesModel.findOneAndUpdate({ city: el.city },
    //                 el, { new: true, upsert: true }
    //             )
    //         }

    //         return { message: "Done.", flag: true }
    //     } catch (e) {
    //         this.logger.error(e.message);
    //         return { message: e.message, flag: false };
    //     }
    // }

    public async updateProperty(req: Request, res: Response)
        : Promise<{ message: string | PropertyStruct, flag: boolean }> {
        try {
            const { categoryId, description, title, uniqueId } = req.body;

            const exist: PropertyStruct = await this.PropertyModel.findOne({ uniqueId: uniqueId, sellerId: req['userId'] });
            if (!exist?.uniqueId) {
                this.logger.error("Failed to update property.");
                return { message: "Failed to update property.", flag: false };
            }

            if (exist.status == PropertyStatus.SOLD || exist.status == PropertyStatus.SUSPENDED) {
                return { message: "Property is sold or suspended.", flag: false };
            }

            const category: { message: string | CategoryStruct, flag: boolean } = await Container.get(CategoryService)
                .getCategoryBasedOnFilter({
                    uniqueId: categoryId
                });
            if (!category.flag) {
                return { message: category.message.toString(), flag: false };
            }

            let a = '', b = '', c = '', d = '';
            if (this.isEnglish(title)) {
                a = title;
                b = description;
            } else {
                c = title;
                d = description;
            }

            const obj: PropertyStruct = {
                ...req.body,
                location: {
                    ...req.body.location,
                    geo: {
                        type: "Point",
                        coordinates: [
                            parseFloat(req.body.location.longitude),
                            parseFloat(req.body.location.latitude)
                        ]
                    }
                },
                sellerId: req['userId'],
                isFeatured: false,
                title: a,
                description: b,
                titleArabic: c,
                descriptionArabic: d,
                status: PropertyStatus.INITIATED,
                views: 0,
                expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : new Date(new Date().setFullYear(new Date().getFullYear() + 1))
            };

            const entry: PropertyStruct = await this.PropertyModel.findOneAndUpdate({ uniqueId: uniqueId, sellerId: req['userId'] }, {
                $set: obj
            }, { new: true });
            if (!entry?.uniqueId) {
                this.logger.error("Failed to update property.");
                return { message: "Failed to update property.", flag: false };
            }

            return { message: entry, flag: true }
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async uploadImgProperty(req: Request, res: Response)
        : Promise<{ message: string | PropertyStruct, flag: boolean }> {
        try {
            const { uniqueId } = req.body;

            const exist: PropertyStruct = await this.PropertyModel.findOne({ uniqueId: uniqueId, sellerId: req['userId'] });
            if (!exist?.uniqueId) {
                return { message: "Failed to get property.", flag: false };
            }

            // if (exist.status !== PropertyStatus.INCOMPLETE) {
            //     return { message: "You can't not upload image after property gets active.", flag: false };
            // }
            if (exist.status == PropertyStatus.SOLD || exist.status == PropertyStatus.SUSPENDED) {
                return { message: "Property is sold or suspended.", flag: false };
            }

            const obj = {
                images: req.body.images ?? [],
                status: PropertyStatus.INITIATED
            };

            const entry: PropertyStruct = await this.PropertyModel.findOneAndUpdate({ uniqueId: uniqueId }, {
                $set: obj
            }, { new: true });
            if (!entry?.uniqueId) {
                this.logger.error("Failed to update property.");
                return { message: "Failed to update property.", flag: false };
            }

            return { message: entry, flag: true }
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async deleteImages(req: Request, res: Response)
        : Promise<{ message: string, flag: boolean }> {
        try {
            const { uniqueId, image } = req.body;

            const exist: PropertyStruct = await this.PropertyModel.findOne({ uniqueId: uniqueId, sellerId: req['userId'] });
            if (!exist?.uniqueId) {
                return { message: "Failed to get property.", flag: false };
            }

            if (image) {
                if (!exist?.images?.includes(image)) {
                    return { message: "Image file is invalid.", flag: false };
                }
                await this.PropertyModel.findOneAndUpdate({ uniqueId: uniqueId }, {
                    $pull: { images: image }
                }, { new: true });

                if (exist?.images.length === 1) {
                    await this.PropertyModel.findOneAndUpdate({ uniqueId: uniqueId }, {
                        $set: {
                            status: PropertyStatus.INCOMPLETE
                        }
                    }, { new: true });
                }

                // Delete file from disk
                const filePath = path.join(__dirname, '../../files/uploads/', image); // Adjust path as needed
                fs.unlink(filePath, (err: { message: any; }) => {
                    if (err) {
                        this.logger.warn(`Failed to delete file: ${filePath}. Error: ${err.message}`);
                    } else {
                        this.logger.info(`Deleted file: ${filePath}`);
                    }
                });
            } else {
                await this.PropertyModel.findOneAndUpdate({ uniqueId: uniqueId }, {
                    $set: {
                        images: [],
                        status: PropertyStatus.INCOMPLETE
                    }
                }, { new: true });
            }

            return { message: "Images deleted successfully.", flag: true }
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async deleteVideos(req: Request, res: Response)
        : Promise<{ message: string, flag: boolean }> {
        try {
            const { uniqueId, fileName } = req.body;

            const exist: PropertyStruct = await this.PropertyModel.findOne({ uniqueId: uniqueId, sellerId: req['userId'] });
            if (!exist?.uniqueId) {
                return { message: "Failed to get property.", flag: false };
            }

            if (fileName) {
                if (exist?.videos?.fileName !== fileName) {
                    return { message: "Video file is invalid.", flag: false };
                }

                await this.PropertyModel.findOneAndUpdate(
                    { uniqueId: uniqueId },
                    { $set: { videos: { fileName: fileName, showInReels: false } } }, // overwrite full object
                    { new: true }
                );

                // Delete file from disk
                const filePath = path.join(__dirname, '../../files/uploads/', fileName); // Adjust path as needed
                fs.unlink(filePath, (err: { message: any; }) => {
                    if (err) {
                        this.logger.warn(`Failed to delete video: ${filePath}. Error: ${err.message}`);
                    } else {
                        this.logger.info(`Deleted video: ${filePath}`);
                    }
                });
            } else {
                await this.PropertyModel.findOneAndUpdate({ uniqueId: uniqueId }, {
                    $set: {
                        videos: {},
                    }
                }, { new: true });
            }

            return { message: "Videos deleted successfully.", flag: true }
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async uploadVideoProperty(req: Request, res: Response)
        : Promise<{ message: string | PropertyStruct, flag: boolean }> {
        try {
            const { uniqueId } = req.body;

            const exist: PropertyStruct = await this.PropertyModel.findOne({ uniqueId: uniqueId, sellerId: req['userId'] });
            if (!exist?.uniqueId) {
                return { message: "Failed to get property.", flag: false };
            }

            // if (exist.status !== PropertyStatus.INCOMPLETE) {
            //     return { message: "You can't not upload video after property gets active.", flag: false };
            // }

            if (exist.status == PropertyStatus.SOLD || exist.status == PropertyStatus.SUSPENDED) {
                return { message: "Property is sold or suspended.", flag: false };
            }

            const obj = {
                videos: {
                    fileName: req.body.videos ?? "",
                    showInReels: false
                }
            }

            const entry: PropertyStruct = await this.PropertyModel.findOneAndUpdate({ uniqueId: uniqueId }, {
                $set: obj
            }, { new: true });
            if (!entry?.uniqueId) {
                this.logger.error("Failed to upload videos.");
                return { message: "Failed to upload videos.", flag: false };
            }

            return { message: entry, flag: true }
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers

        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // in kilometers
    }

    public async homePageList(req: Request, res: Response)
        : Promise<{ message: string | PropertyInputDTO, flag: boolean }> {
        try {
            let userDetail: IUser = {} as IUser;
            if (req['userId']) {
                const user: { message: string | IUser, flag: boolean } = await Container.get(UserService)
                    .getUserDetails(req, res);
                if (typeof user.message === 'object') {
                    userDetail = user.message;
                }
            }

            let aggregate = [], flag = false;
            let {
                page,
                searchTerm,
                latitude,
                longitude
            } = req.query;

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
                }
            };

            if (searchTerm) {
                matchObj.$match.$or.push({ title: { $regex: searchTerm, $options: 'i' } },
                    { description: { $regex: searchTerm, $options: 'i' } },
                );
                // flag = true;
            } else {
                delete matchObj.$match.$or;
            }

            Object.assign(matchObj.$match, { isDeleted: false });
            Object.assign(matchObj.$match, { status: PropertyStatus.ACTIVE });
            Object.assign(matchObj.$match, { sellerId: { $ne: req['userId'] } });

            obj.$facet.data.push(matchObj);
            // @ts-ignore
            obj.$facet.totalCount.splice(0, 0, matchObj);

            const userLookup = {
                $lookup: {
                    from: 'users',
                    let: {
                        id: '$sellerId'
                    },
                    pipeline: [{
                        $match: {
                            $expr: {
                                $eq: ["$uniqueId", "$$id"]
                            }
                        },
                    },
                    {
                        $project: {
                            uniqueId: 1,
                            name: 1,
                            phone: 1,
                            email: 1
                        }
                    }],
                    as: 'seller'
                }
            }

            const categoryLookup = {
                $lookup: {
                    from: 'categories', // Correct collection name
                    let: { id: '$categoryId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$uniqueId', '$$id']
                                }
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                nameArabic: 1,
                            }
                        }
                    ],
                    as: 'category' // Rename as per your use case
                }
            };

            obj.$facet.data.push({ $sort: { createdAt: -1 } });

            const projection = {
                $project: {
                    title: 1,
                    titleArabic: 1,
                    description: 1,
                    descriptionArabic: 1,
                    images: { $arrayElemAt: ["$images", 0] },
                    price: 1,
                    for: 1,
                    status: 1,
                    category: 1,
                    address: "$location.address",
                    uniqueId: 1,
                    livingRooms: "$features.livingRooms",
                    bedRooms: "$features.bedRooms",
                    bathRoom: "$features.bathRooms",
                    createdAt: 1,
                    updatedAt: 1,
                    // views: 1,
                    // likes: 1,
                    distance: 1,
                }
            };

            const addFields = {
                $addFields: {
                    isWishlist: {
                        $in: ['$uniqueId', userDetail.wishlist]
                    }
                }
            }

            if (+page > 0) {
                let skip = (+page - 1) * +process.env.LIMIT;
                obj.$facet.data.push({ $skip: skip });
                obj.$facet.data.push({ $limit: +process.env.LIMIT });
                obj.$facet.data.push(userLookup);
                obj.$facet.data.push({ $unwind: "$seller" });
                obj.$facet.data.push(categoryLookup);
                obj.$facet.data.push({ $unwind: "$category" });
                obj.$facet.data.push(projection);
                if (req['userId']) {
                    obj.$facet.data.push(addFields);
                }
            }

            const maxDistance = zoomLevelToDistance.CITY; // fallback
            if (latitude && longitude) {
                const geo = {
                    $geoNear: {
                        near: {
                            type: "Point",
                            coordinates: [longitude, latitude]
                        },
                        distanceField: "distance",
                        maxDistance: maxDistance, // meters
                        spherical: true,
                        key: "location.geo" // Important: this points to your schema's field
                    }
                }
                aggregate.push(geo);
            }


            aggregate.push(obj);

            let query = await this.PropertyModel.aggregate(aggregate);
            if (query.length === 0) {
                return { message: { data: [], totalCount: 0 }, flag: true };
            }
            let result = query[0];

            return {
                message: {
                    data: result["data"] || query,
                    totalCount: result["totalCount"]?.length === 0 ? 0 : result["totalCount"]?.[0]?.count || query.length
                }, flag: true
            };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getPropertyList(req: Request, res: Response)
        : Promise<{ message: string | PropertyInputDTO, flag: boolean }> {
        try {
            let userDetail: IUser = {} as IUser;
            if (req['userId']) {
                const user: { message: string | IUser, flag: boolean } = await Container.get(UserService)
                    .getUserDetails(req, res);
                if (typeof user.message === 'object') {
                    userDetail = user.message;
                }
            }

            let aggregate = [], flag = false;
            let {
                page,
                searchTerm,
                sortBy,
                categoryId,
                minPrice,
                maxPrice,
                bedRooms,
                livingRooms,
                bathRooms,
                kitchen,
                driverRoom,
                maidRoom,
                pool,
                basement,
                fromDate,
                toDate,
                latitude,
                longitude
            } = req.query;

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
                    createdAt: {}
                }
            };

            // Date filter logic
            if (fromDate || toDate) {
                matchObj.$match.createdAt = {};

                if (fromDate) {
                    const fromDateStart = new Date(new Date(fromDate.toString()).setUTCHours(0, 0, 0, 0));
                    matchObj.$match.createdAt['$gte'] = fromDateStart;
                    flag = true;
                }

                if (toDate) {
                    const toDateEnd = new Date(new Date(toDate.toString()).setUTCHours(23, 59, 59, 999));
                    matchObj.$match.createdAt['$lte'] = toDateEnd;
                    flag = true;
                }

            } else {
                delete matchObj.$match.createdAt;
            }

            if (searchTerm) {
                matchObj.$match.$or.push({ title: { $regex: searchTerm, $options: 'i' } },
                    { description: { $regex: searchTerm, $options: 'i' } },
                );
                flag = true;
            } else {
                delete matchObj.$match.$or;
            }

            if (req['forSelf']) {
                Object.assign(matchObj.$match, { sellerId: req['userId'] });
                Object.assign(matchObj.$match, { isDeleted: false });
                flag = true;
            } else {
                if (req['role'] != UserRole.ADMIN) {
                    Object.assign(matchObj.$match, { sellerId: { $ne: req['userId'] } });
                    Object.assign(matchObj.$match, { isDeleted: false });
                    Object.assign(matchObj.$match, { status: PropertyStatus.ACTIVE });
                    flag = true;
                } else {
                    if (req.query.status) {
                        flag = true;
                        Object.assign(matchObj.$match, { status: req.query.status });
                    }
                }
            }

            if (categoryId) {
                Object.assign(matchObj.$match, { categoryId: categoryId });
                flag = true;
            }

            // Filter by features.bedRooms
            if (bedRooms) {
                matchObj.$match['features.bedRooms'] = +bedRooms;
                flag = true;
            }

            // Filter by features.livingRooms
            if (livingRooms) {
                matchObj.$match['features.livingRooms'] = +livingRooms;
                flag = true;
            }

            // Filter by features.bathRooms
            if (bathRooms) {
                matchObj.$match['features.bathRooms'] = +bathRooms;
                flag = true;
            }

            // Filter by features.bathRooms
            if (req.query.for) {
                Object.assign(matchObj.$match, { for: req.query.for });
                flag = true;
            }

            // Boolean filters from features (converted from string 'true'/'false')
            const booleanFilters = {
                kitchen,
                driverRoom,
                maidRoom,
                pool,
                basement
            };

            for (const [key, value] of Object.entries(booleanFilters)) {
                if (value !== undefined) {
                    matchObj.$match[`features.${key}`] = value.toString() === 'true';
                    flag = true;
                }
            }

            if (minPrice || maxPrice) {
                matchObj.$match['$expr'] = {
                    $and: []
                };

                if (minPrice) {
                    matchObj.$match['$expr'].$and.push({
                        $gte: [{ $toDouble: "$price" }, parseFloat(minPrice.toString())]
                    });
                }

                if (maxPrice) {
                    matchObj.$match['$expr'].$and.push({
                        $lte: [{ $toDouble: "$price" }, parseFloat(maxPrice.toString())]
                    });
                }

                flag = true;
            }


            // let isDateFilter = false;
            // if (fromDate) {
            //     isDateFilter = true;
            //     let dateString = new Date(fromDate.toString());
            //     dateString.setUTCHours(0, 0, 0, 0);
            //     Object.assign(matchObj.$match.createdAt, { $gte: dateString });
            //     flag = true;
            // }
            // if (toDate) {
            //     isDateFilter = true;
            //     let dateString = new Date(toDate.toString());
            //     dateString.setUTCHours(23, 59, 59, 999);
            //     Object.assign(matchObj.$match.createdAt, { $lte: dateString });
            //     flag = true;
            // }
            // if (!isDateFilter) {
            //     delete matchObj.$match.createdAt;
            // }

            if (flag) {
                obj.$facet.data.push(matchObj);
                // @ts-ignore
                obj.$facet.totalCount.splice(0, 0, matchObj);
            }

            const userLookup = {
                $lookup: {
                    from: 'users',
                    let: {
                        id: '$sellerId'
                    },
                    pipeline: [{
                        $match: {
                            $expr: {
                                $eq: ["$uniqueId", "$$id"]
                            }
                        },
                    },
                    {
                        $project: {
                            uniqueId: 1,
                            name: 1,
                            phone: 1,
                            email: 1
                        }
                    }],
                    as: 'seller'
                }
            }

            const categoryLookup = {
                $lookup: {
                    from: 'categories', // Correct collection name
                    let: { id: '$categoryId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$uniqueId', '$$id']
                                }
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                nameArabic: 1,
                            }
                        }
                    ],
                    as: 'category' // Rename as per your use case
                }
            };

            const projection = {
                $project: {
                    title: 1,
                    titleArabic: 1,
                    description: 1,
                    descriptionArabic: 1,
                    images: { $arrayElemAt: ["$images", 0] },
                    price: 1,
                    for: 1,
                    status: 1,
                    category: 1,
                    address: "$location.address",
                    uniqueId: 1,
                    livingRooms: "$features.livingRooms",
                    bedRooms: "$features.bedRooms",
                    bathRoom: "$features.bathRooms",
                    createdAt: 1,
                    updatedAt: 1,
                    views: 1,
                    likes: 1,
                    distance: 1,
                }
            };

            if (!req['forSelf']) {
                delete projection.$project.views;
                delete projection.$project.likes;
            }

            const addFields = {
                $addFields: {
                    isWishlist: {
                        $in: ['$uniqueId', userDetail.wishlist]
                    }
                    // isWishlist: req['userId']
                    //     ? { $in: ['$uniqueId', userDetail.wishlist] }
                    //     : false
                }
            }

            if (+page > 0) {
                let skip = (+page - 1) * +process.env.LIMIT;
                obj.$facet.data.push({ $skip: skip });
                obj.$facet.data.push({ $limit: +process.env.LIMIT });
                obj.$facet.data.push(userLookup);
                obj.$facet.data.push({ $unwind: "$seller" });
                obj.$facet.data.push(categoryLookup);
                obj.$facet.data.push({ $unwind: "$category" });
                obj.$facet.data.push(projection);
                if (req['userId']) {
                    obj.$facet.data.push(addFields);
                }
            }

            const maxDistance = zoomLevelToDistance.CITY; // fallback

            if (latitude && longitude) {
                const geo = {
                    $geoNear: {
                        near: {
                            type: "Point",
                            coordinates: [longitude, latitude]
                        },
                        distanceField: "distance",
                        maxDistance: maxDistance, // meters
                        spherical: true,
                        key: "location.geo" // Important: this points to your schema's field
                    }
                }
                aggregate.push(geo);

                // sort filter
                if (sortBy === SortBy.PRICE_LTH) {
                    obj.$facet.data.push(
                        { $addFields: { numericPrice: { $toDouble: "$price" } } },
                        { $sort: { numericPrice: 1 } }
                    );
                } else if (sortBy === SortBy.PRICE_HTL) {
                    obj.$facet.data.push(
                        { $addFields: { numericPrice: { $toDouble: "$price" } } },
                        { $sort: { numericPrice: -1 } }
                    );
                } else if (sortBy === SortBy.RECENT) {
                    obj.$facet.data.push({ $sort: { createdAt: -1 } });
                } else {
                    obj.$facet.data.push({ $sort: { distance: 1 } });
                }

                aggregate.push(obj);
            } else {
                // sort filter
                if (sortBy === SortBy.PRICE_LTH) {
                    obj.$facet.data.push(
                        { $addFields: { numericPrice: { $toDouble: "$price" } } },
                        { $sort: { numericPrice: 1 } }
                    );
                } else if (sortBy === SortBy.PRICE_HTL) {
                    obj.$facet.data.push(
                        { $addFields: { numericPrice: { $toDouble: "$price" } } },
                        { $sort: { numericPrice: -1 } }
                    );
                } else {
                    obj.$facet.data.push({ $sort: { createdAt: -1 } });
                }
                aggregate.push(obj);
            }

            let query = await this.PropertyModel.aggregate(aggregate);
            if (query.length === 0) {
                return { message: { data: [], totalCount: 0 }, flag: true };
            }
            let result = query[0];

            return {
                message: {
                    data: result["data"] || query,
                    totalCount: result["totalCount"]?.length === 0 ? 0 : result["totalCount"]?.[0]?.count || query.length
                }, flag: true
            };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getMapList(req: Request, res: Response): Promise<{ message: string | PropertyInputDTO, flag: boolean }> {
        try {
            let userDetail: IUser = {} as IUser;

            if (req['userId']) {
                const user: { message: string | IUser, flag: boolean } = await Container.get(UserService).getUserDetails(req, res);
                if (typeof user.message === 'object') {
                    userDetail = user.message;
                }
            }

            let {
                searchTerm,
                categoryId,
                minPrice,
                maxPrice,
                bedRooms,
                livingRooms,
                bathRooms,
                kitchen,
                driverRoom,
                maidRoom,
                pool,
                basement,
                fromDate,
                toDate,
                latitudeBottom,
                longitudeBottom,
                longitudeTop,
                latitudeTop
            } = req.query;

            const SW = { lat: +latitudeBottom, lng: +longitudeBottom };
            const NE = { lat: +latitudeTop, lng: +longitudeTop };

            const diagonalDistance = this.haversineDistance(SW.lat, SW.lng, NE.lat, NE.lng);
            const groupSizeKm = diagonalDistance * 0.1;
            const latStep = groupSizeKm / 111.32;
            const lngStep = groupSizeKm / (111.32 * Math.cos(((SW.lat + NE.lat) / 2) * Math.PI / 180));

            let matchObj: any = {
                $match: {
                    "location.geo": {
                        $geoWithin: {
                            $box: [
                                [SW.lng, SW.lat],
                                [NE.lng, NE.lat]
                            ]
                        }
                    },
                    isDeleted: false,
                    status: PropertyStatus.ACTIVE,
                    createdAt: {},
                    $or: []
                }
            };

            if (fromDate || toDate) {
                if (fromDate) {
                    const fromDateStart = new Date(new Date(fromDate.toString()).setUTCHours(0, 0, 0, 0));
                    matchObj.$match.createdAt['$gte'] = fromDateStart;
                }

                if (toDate) {
                    const toDateEnd = new Date(new Date(toDate.toString()).setUTCHours(23, 59, 59, 999));
                    matchObj.$match.createdAt['$lte'] = toDateEnd;
                }
            } else {
                delete matchObj.$match.createdAt;
            }

            if (searchTerm) {
                matchObj.$match.$or.push({ title: { $regex: searchTerm, $options: 'i' } }, { description: { $regex: searchTerm, $options: 'i' } });
            } else {
                delete matchObj.$match.$or;
            }

            if (categoryId) matchObj.$match.categoryId = categoryId;
            if (bedRooms) matchObj.$match['features.bedRooms'] = +bedRooms;
            if (livingRooms) matchObj.$match['features.livingRooms'] = +livingRooms;
            if (bathRooms) matchObj.$match['features.bathRooms'] = +bathRooms;
            if (req.query.for) matchObj.$match.for = req.query.for;

            const booleanFilters = { kitchen, driverRoom, maidRoom, pool, basement };
            for (const [key, value] of Object.entries(booleanFilters)) {
                if (value !== undefined) {
                    matchObj.$match[`features.${key}`] = value.toString() === 'true';
                }
            }

            if (minPrice || maxPrice) {
                matchObj.$match['$expr'] = { $and: [] };
                if (minPrice) {
                    matchObj.$match['$expr'].$and.push({
                        $gte: [{ $toDouble: "$price" }, parseFloat(minPrice.toString())]
                    });
                }
                if (maxPrice) {
                    matchObj.$match['$expr'].$and.push({
                        $lte: [{ $toDouble: "$price" }, parseFloat(maxPrice.toString())]
                    });
                }
            }

            const userLookup = {
                $lookup: {
                    from: 'users',
                    let: { id: '$sellerId' },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$uniqueId", "$$id"] } } },
                        { $project: { uniqueId: 1, name: 1, phone: 1, email: 1 } }
                    ],
                    as: 'seller'
                }
            };

            const categoryLookup = {
                $lookup: {
                    from: 'categories',
                    let: { id: '$categoryId' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$uniqueId', '$$id'] } } },
                        { $project: { name: 1, nameArabic: 1 } }
                    ],
                    as: 'category'
                }
            };

            // STEP 1: Run a count query to check how many properties match the filters
            const countPipeline = [matchObj, { $count: "total" }];
            const countResult = await this.PropertyModel.aggregate(countPipeline);
            const totalMatchingProperties = countResult[0]?.total || 0;

            // STEP 2: Check the two conditions
            const isLessThan30 = totalMatchingProperties < 30;
            const isDiagonalDistanceSmall = diagonalDistance < 10;

            if (isLessThan30 || isDiagonalDistanceSmall) {
                // No need to group or cluster — just return full matching list
                const simpleAggregate = [
                    matchObj,
                    {
                        $addFields: {
                            isWishlist: {
                                $in: ['$uniqueId', userDetail.wishlist || []]
                            },
                            latitude: { $arrayElemAt: ["$location.geo.coordinates", 1] },
                            longitude: { $arrayElemAt: ["$location.geo.coordinates", 0] }
                        }
                    },
                    categoryLookup,
                    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            count: { $literal: 1 },
                            latitude: 1,
                            longitude: 1,
                            title: 1,
                            titleArabic: 1,
                            description: 1,
                            descriptionArabic: 1,
                            images: { $arrayElemAt: ["$images", 0] },
                            price: 1,
                            for: 1,
                            status: 1,
                            category: 1,
                            address: "$location.address",
                            uniqueId: 1,
                            livingRooms: "$features.livingRooms",
                            bedRooms: "$features.bedRooms",
                            bathRoom: "$features.bathRooms",
                            createdAt: 1,
                            updatedAt: 1,
                            distance: 1,
                            isWishlist: 1
                        }
                    }
                ];

                const query = await this.PropertyModel.aggregate(simpleAggregate);

                return {
                    message: {
                        data: query,
                        totalCount: query.length
                    },
                    flag: true
                };
            }

            const aggregate = [
                matchObj,
                {
                    $addFields: {
                        isWishlist: {
                            $in: ['$uniqueId', userDetail.wishlist || []]
                        },
                        gridLat: {
                            $floor: {
                                $divide: [{ $arrayElemAt: ["$location.geo.coordinates", 1] }, latStep]
                            }
                        },
                        gridLng: {
                            $floor: {
                                $divide: [{ $arrayElemAt: ["$location.geo.coordinates", 0] }, lngStep]
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: { lat: "$gridLat", lng: "$gridLng" },
                        count: { $sum: 1 },
                        properties: { $push: "$$ROOT" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        count: 1,
                        lat: "$_id.lat",
                        lng: "$_id.lng",
                        properties: 1
                    }
                },
                { $unwind: "$properties" },
                { $addFields: { isSingle: { $eq: ["$count", 1] } } },
                {
                    $project: {
                        count: 1,
                        lat: 1,
                        lng: 1,
                        isSingle: 1,
                        property: "$properties"
                    }
                },
                {
                    $facet: {
                        clusters: [
                            { $match: { isSingle: false } },
                            {
                                $group: {
                                    _id: { gridLat: "$lat", gridLng: "$lng" },
                                    count: { $first: "$count" },
                                    property: { $first: "$property" } // Use one of the properties in the cluster
                                }
                            },
                            {
                                $addFields: {
                                    latitude: {
                                        $arrayElemAt: ["$property.location.geo.coordinates", 1]
                                    },
                                    longitude: {
                                        $arrayElemAt: ["$property.location.geo.coordinates", 0]
                                    }
                                }
                            },
                            // {
                            //     $addFields: {
                            //         latitude: {
                            //             $multiply: [
                            //                 { $add: [{ $toDouble: "$_id.gridLat" }, 0.5] },
                            //                 latStep  // replace with the actual value (as a number, not a variable)
                            //             ]
                            //         },
                            //         longitude: {
                            //             $multiply: [
                            //                 { $add: [{ $toDouble: "$_id.gridLng" }, 0.5] },
                            //                 lngStep  // replace with the actual value (as a number, not a variable)
                            //             ]
                            //         }
                            //     }
                            // },
                            {
                                $project: {
                                    _id: 0,
                                    latitude: 1,
                                    longitude: 1,
                                    count: 1
                                }
                            }
                        ],
                        singles: [
                            { $match: { isSingle: true } },
                            { $replaceRoot: { newRoot: "$property" } },
                            // userLookup,
                            // { $unwind: { path: "$seller", preserveNullAndEmptyArrays: true } },
                            categoryLookup,
                            { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
                            {
                                $addFields: {
                                    latitude: { $arrayElemAt: ["$location.geo.coordinates", 1] },
                                    longitude: { $arrayElemAt: ["$location.geo.coordinates", 0] }
                                }
                            },
                            {
                                $project: {
                                    count: { $literal: 1 },
                                    // lat: "$gridLat",
                                    // lng: "$gridLng",
                                    latitude: 1,
                                    longitude: 1,
                                    title: 1,
                                    titleArabic: 1,
                                    description: 1,
                                    descriptionArabic: 1,
                                    images: { $arrayElemAt: ["$images", 0] },
                                    price: 1,
                                    for: 1,
                                    status: 1,
                                    category: 1,
                                    address: "$location.address",
                                    uniqueId: 1,
                                    livingRooms: "$features.livingRooms",
                                    bedRooms: "$features.bedRooms",
                                    bathRoom: "$features.bathRooms",
                                    createdAt: 1,
                                    updatedAt: 1,
                                    distance: 1,
                                    // seller: 1,
                                    isWishlist: 1
                                }
                            }
                        ]
                    }
                },
                {
                    $project: {
                        data: { $concatArrays: ["$clusters", "$singles"] }
                    }
                },
                { $unwind: "$data" },
                { $replaceRoot: { newRoot: "$data" } }
            ];

            // console.log(JSON.stringify(aggregate));

            const query = await this.PropertyModel.aggregate(aggregate);

            return {
                message: {
                    data: query,
                    totalCount: query.length
                },
                flag: true
            };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getPropertyDetails(req, res, filter: { uniqueId: string })
        : Promise<{ message: string | PropertyStruct, flag: boolean }> {
        try {
            let userDetail: IUser = {} as IUser;

            if (req['userId']) {
                const user: { message: string | IUser, flag: boolean } = await Container.get(UserService)
                    .getUserDetails(req, res);
                if (typeof user.message === 'object') {
                    userDetail = user.message;
                }
            }

            const aggregate = [
                {
                    $match: {
                        uniqueId: filter.uniqueId
                    }
                },
                {
                    $addFields: {
                        isWishlist: {
                            $in: ['$uniqueId', userDetail.wishlist || []]
                        }
                    }
                },
                {
                    $limit: 1
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "sellerId",
                        foreignField: "uniqueId",
                        as: "seller"
                    }
                },
                {
                    $unwind: "$seller"
                },
                {
                    $addFields: {
                        sellerName: "$seller.name",
                        sellerProfile: "$seller.profile",
                        sellerPhone: "$seller.phone",
                        adId: "$seller.adId",
                        isVerified: "$seller.isVerified",
                        adExpiry: "$seller.expiryDate",
                        sellerIsVerified: "$seller.isVerified",
                    }
                },
                {
                    $lookup: {
                        from: "properties",
                        let: {
                            currentFor: "$for",
                            currentCity: "$location.city",
                            currentId: "$uniqueId"
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$for", "$$currentFor"] }, // Same 'for' (rent/sale)
                                            { $eq: ["$status", PropertyStatus.ACTIVE] },
                                            {
                                                $eq: [
                                                    "$location.city",
                                                    "$$currentCity"
                                                ]
                                            }, // Same city
                                            {
                                                $ne: [
                                                    "$uniqueId",
                                                    "$$currentId"
                                                ]
                                            } // Exclude current ad
                                        ]
                                    }
                                }
                            },
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
                            },
                            {
                                $addFields: {
                                    isWishlist: {
                                        $in: ['$uniqueId', userDetail.wishlist || []]
                                    }
                                }
                            },
                        ],
                        as: "similarAds"
                    }
                },
                {
                    $lookup: {
                        from: "comments",
                        let: { id: "$uniqueId" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$propertyId", "$$id"] }
                                }
                            },
                            { $sort: { createdAt: -1 } },
                            {
                                $facet: {
                                    totalComments: [
                                        { $count: "count" }
                                    ],
                                    lastComment: [
                                        { $limit: 1 },
                                        {
                                            $lookup: {
                                                from: "users",
                                                localField: "userId",
                                                foreignField: "uniqueId",
                                                as: "user"
                                            }
                                        },
                                        { $unwind: "$user" },
                                        {
                                            $project: {
                                                text: 1,
                                                createdAt: 1,
                                                userId: 1,
                                                isAnonymous: 1,
                                                commentBy: 1,
                                                userName: "$user.name",
                                                userProfile: "$user.profile",
                                                userIsVerified: "$user.isVerified"
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                $project: {
                                    totalComments: { $ifNull: [{ $arrayElemAt: ["$totalComments.count", 0] }, 0] },
                                    lastComment: { $arrayElemAt: ["$lastComment", 0] }
                                }
                            }
                        ],
                        as: "comments"
                    }
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
                // {
                //     $lookup: {
                //         from: "rooms",
                //         let: {
                //             propertyId: "$uniqueId",
                //             sellerId: "$sellerId"
                //         },
                //         pipeline: [
                //             {
                //                 $match: {
                //                     $expr: {
                //                         $and: [
                //                             { $eq: ["$propertyId", "$$propertyId"] },
                //                             {
                //                                 $or: [
                //                                     { $and: [{ $eq: ["$userId1", req['userId']] }, { $eq: ["$userId2", "$$sellerId"] }] },
                //                                     { $and: [{ $eq: ["$userId2", req['userId']] }, { $eq: ["$userId1", "$$sellerId"] }] }
                //                                 ]
                //                             }
                //                         ]
                //                     }
                //                 }
                //             },
                //             {
                //                 $lookup: {
                //                     from: "chats",
                //                     let: {
                //                         roomId: "$roomId"
                //                     },
                //                     pipeline: [
                //                         {
                //                             $match: {
                //                                 $expr: {
                //                                     $and: [
                //                                         { $eq: ["$roomId", "$$roomId"] },
                //                                         { $eq: ["$userId", req['userId']] }
                //                                     ]
                //                                 }
                //                             }
                //                         },
                //                         {
                //                             $project: {
                //                                 _id: 0,
                //                                 chatType: "$type",
                //                                 isImp: 1,
                //                                 uniqueId: "$chatId"
                //                             }
                //                         }
                //                     ],
                //                     as: "chatInfo"
                //                 }
                //             },
                //             {
                //                 $unwind: {
                //                     path: "$chatInfo",
                //                     preserveNullAndEmptyArrays: true
                //                 }
                //             },
                //             {
                //                 $project: {
                //                     chatInfo: 1,
                //                     roomId: 1,
                //                     userId1: 1,
                //                     userId2: 1,
                //                     isBlocked: 1,
                //                     blockedBy: 1
                //                 }
                //             }
                //         ],
                //         as: "roomChat"
                //     }
                // },
                // { $unwind: { path: "$roomChat", preserveNullAndEmptyArrays: true } },
                {
                    $addFields: {
                        comments: { $arrayElemAt: ["$comments", 0] },
                        isSeller: {
                            $eq: ["$sellerId", req['userId']]
                        }
                    }
                },
                {
                    $project: {
                        seller: 0,
                    }
                },
            ];

            let query: PropertyStruct[] = await this.PropertyModel.aggregate(aggregate);

            await this.PropertyModel.findOneAndUpdate({ uniqueId: filter.uniqueId, sellerId: { $ne: req['userId'] } }, {
                $inc: {
                    views: 1
                }
            }, { new: true });

            if (!query[0]?.uniqueId) {
                return { message: "No Property found.", flag: false };
            }

            return { message: query[0], flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getSingleProperty(filter: { uniqueId: string, status: PropertyStatus })
        : Promise<{ message: string | PropertyStruct, flag: boolean }> {
        try {
            let query: PropertyStruct = await this.PropertyModel.findOne(filter);
            if (!query?.uniqueId) {
                return { message: "No Property found.", flag: false };
            }

            return { message: query, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getDashboard()
        : Promise<{ message: string | any, flag: boolean }> {
        try {
            let query = await this.PropertyModel.aggregate([
                {
                    $facet: {
                        property: [
                            {
                                $group: {
                                    _id: "$status",
                                    count: { $sum: 1 }
                                }
                            }
                        ],
                        activeSellers: [
                            { $match: { status: "active" } },
                            { $group: { _id: "$sellerId" } },
                            { $count: "count" }
                        ],
                        activeOrSoldSellers: [
                            {
                                $match: {
                                    status: {
                                        $in: ["active", "sold"]
                                    }
                                }
                            },
                            { $group: { _id: "$sellerId" } },
                            { $count: "count" }
                        ],
                        currentBuyers: [
                            // Match only active properties
                            { $match: { status: "active" } },

                            // Join rooms for these properties
                            {
                                $lookup: {
                                    from: "rooms",
                                    let: { id: "$uniqueId" },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ["$propertyId", "$$id"]
                                                }
                                            }
                                        },
                                        { $count: "count" }
                                    ],
                                    as: "rooms"
                                }
                            },
                            { $unwind: "$rooms" },
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$rooms.count" }
                                }
                            }
                        ]
                    }
                }
            ]);

            return { message: query[0], flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async adminUpdateStatus(req: Request, res: Response)
        : Promise<{ message: string | PropertyStruct, flag: boolean }> {
        try {
            const { status } = req.body;

            let property: PropertyStruct = await this.PropertyModel.findOne({ uniqueId: req.body.uniqueId });
            if (!property?.uniqueId) {
                return { message: "Property not available.", flag: false };
            }

            if (status == PropertyStatus.ACTIVE) {
                if (property.images?.length == 0) {
                    return { message: "Image is not available on this property.", flag: false };
                }
                // if (!property.title && !property.titleArabic) {
                //     return { message: "Title is not available.", flag: false };
                // }
                // if (!property.description && !property.descriptionArabic) {
                //     return { message: "Title is not available.", flag: false };
                // }
            }

            let query: PropertyStruct = await this.PropertyModel.findOneAndUpdate({ uniqueId: req.body.uniqueId }, {
                $set: { status: status }
            }, { new: true });
            if (!query?.uniqueId) {
                return { message: "Failed to update.", flag: false };
            }
            
            await Container.get(FirebaseService).sendNotification({
                // fcmToken: (user.message as IUser).mobileToken,
                title: `Ad status update`,
                body: `Your Ad has been ${status == PropertyStatus.ACTIVE
                    ? 'approved' : status} now`,
                type: NotificationType.AD,
                pId: property.uniqueId,
                receiverId: property.sellerId
            });

            return { message: query, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async updateStatus(req: Request, res: Response)
        : Promise<{ message: string | PropertyStruct, flag: boolean }> {
        try {
            const { status } = req.body;

            let property: PropertyStruct = await this.PropertyModel.findOne({ uniqueId: req.body.uniqueId });
            if (!property?.uniqueId) {
                return { message: "Property not available.", flag: false };
            }

            if (status === PropertyStatus.RE_PUBLISH) {
                if (![PropertyStatus.EXPIRED, PropertyStatus.UN_PUBLISH].includes(property.status)) {
                    return { message: "You can't RePublish.", flag: false };
                }
            }

            if (status === PropertyStatus.UN_PUBLISH || status === PropertyStatus.SOLD) {
                if (![PropertyStatus.ACTIVE].includes(property.status)) {
                    return { message: "Property is not active.", flag: false };
                }
            }

            if (status == PropertyStatus.ACTIVE) {
                if (property.images?.length == 0) {
                    return { message: "Image is not available on this property.", flag: false };
                }
                // if (!property.title && !property.titleArabic) {
                //     return { message: "Title is not available.", flag: false };
                // }
                // if (!property.description && !property.descriptionArabic) {
                //     return { message: "Title is not available.", flag: false };
                // }
            }

            let query: PropertyStruct = await this.PropertyModel.findOneAndUpdate({ uniqueId: req.body.uniqueId }, {
                $set: { status: status }
            }, { new: true });
            if (!query?.uniqueId) {
                return { message: "Failed to update.", flag: false };
            }

            return { message: query, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async deleteProperty(req: Request, res: Response)
        : Promise<{ message: string, flag: boolean }> {
        try {
            let property: PropertyStruct = await this.PropertyModel.findOne({ uniqueId: req.query.uniqueId.toString() });
            if (!property?.uniqueId) {
                return { message: "Property not available.", flag: false };
            }

            let query: PropertyStruct = await this.PropertyModel.findOneAndUpdate({ uniqueId: req.query.uniqueId.toString() }, {
                $set: { isDeleted: true, status: PropertyStatus.EXPIRED }
            }, { new: true });

            return { message: "Deleted successfully.", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async updateFields(req: Request, res: Response)
        : Promise<{ message: string | PropertyStruct, flag: boolean }> {
        try {
            const { uniqueId, ...obj } = req.body;

            let property: PropertyStruct = await this.PropertyModel.findOne({ uniqueId: uniqueId });
            if (!property?.uniqueId) {
                return { message: "Property not available.", flag: false };
            }

            let query: PropertyStruct = await this.PropertyModel.findOneAndUpdate({ uniqueId: uniqueId }, {
                $set: obj
            }, { new: true });

            if (!query?.uniqueId) {
                return { message: "Failed to update.", flag: false };
            }

            return { message: query, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async incrementLike(filters: { uniqueId: string })
        : Promise<{ message: string, flag: boolean }> {
        try {

            let query: PropertyStruct = await this.PropertyModel.findOneAndUpdate({ uniqueId: filters.uniqueId }, {
                $inc: {
                    likes: 1
                }
            }, { new: true });

            if (!query?.uniqueId) {
                return { message: "Failed to update.", flag: false };
            }

            return { message: "Success.", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async decrementLike(filters: { uniqueId: string })
        : Promise<{ message: string | PropertyStruct, flag: boolean }> {
        try {

            let query: PropertyStruct = await this.PropertyModel.findOneAndUpdate({ uniqueId: filters.uniqueId }, {
                $inc: {
                    likes: -1
                }
            }, { new: true });

            if (!query?.uniqueId) {
                return { message: "Failed to update.", flag: false };
            }

            return { message: "Success.", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async searchCity(req: Request, res: Response)
        : Promise<{ message: string | CitiesStruct[], flag: boolean }> {
        try {
            const { searchTerm } = req.query;

            if (searchTerm) {
                const pipeline = [
                    {
                        $match: {
                            city: { $regex: searchTerm, $options: "i" }
                        }
                    },
                    {
                        $project: {
                            city: 1,
                            country: 1,
                            latitude: 1,
                            longitude: 1
                        }
                    }
                ];

                const citiesMatched: CitiesStruct[] = await this.CitiesModel.aggregate(pipeline);

                // Step 2: If no city found, search properties
                let results = citiesMatched;

                if (citiesMatched.length === 0) {
                    const propertiesMatched = await this.PropertyModel.aggregate([
                        {
                            $match: {
                                "location.city": { $regex: searchTerm, $options: "i" }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                city: "$location.city",
                                country: "$location.country",
                                countryCode: "$location.countryCode",
                                region: "$location.region",
                                latitude: "$location.latitude",
                                longitude: "$location.longitude"
                            }
                        },
                        {
                            $group: {
                                _id: {
                                    city: "$city",
                                    country: "$country",
                                },
                                city: { $first: "$city" },
                                country: { $first: "$country" },
                                countryCode: { $first: "$countryCode" },
                                region: { $first: "$region" },
                                latitude: { $first: "$latitude" },
                                longitude: { $first: "$longitude" }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                            }
                        }
                    ]);
                    results = propertiesMatched;
                }

                return { message: results, flag: true };
            }

            const entries: CitiesStruct[] = await this.CitiesModel.find({});
            return { message: entries, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async showInReels(req: Request, res)
        : Promise<{ message: string, flag: boolean }> {
        try {
            const { uniqueId, video, status } = req.body;
            let query: PropertyStruct = await this.PropertyModel.findOneAndUpdate({ uniqueId: uniqueId, "videos.fileName": video }, {
                $set: {
                    videos: {
                        fileName: video,
                        showInReels: status
                    }
                }
            }, { new: true });

            if (!query?.uniqueId) {
                return { message: "Failed to update.", flag: false };
            }

            return { message: "Success.", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }
}