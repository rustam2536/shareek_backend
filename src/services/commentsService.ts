import { Container, Inject, Service } from "typedi";
import { Request, Response } from "express";
import Common from "@/services/commonService";
import { CommentsStruct, ReplyBy, ReplyStruct } from "@/interfaces/comments";
import PropertyService from "./propertyService";
import { PropertyStatus, PropertyStruct } from "@/interfaces/property";

@Service()
export default class CommentService {

    constructor(
        @Inject('logger') private logger,
        @Inject('commentsModel') private CommentsModel: Models.CommentsModel
    ) {
    }

    public async createComment(req: Request, res: Response)
        : Promise<{ message: string, flag: boolean }> {
        try {
            const property = await Container.get(PropertyService)
                .getSingleProperty({ uniqueId: req.body.uniqueId, status: PropertyStatus.ACTIVE });
            if (!property.flag) {
                return { message: property.message.toString(), flag: false };
            }

            const obj: CommentsStruct = {
                uniqueId: Container.get(Common).generateUniqueID(process.env.COMMENTS_PREFIX),
                propertyId: req.body.uniqueId,
                text: req.body.text,
                isApproved: false,
                userId: req['userId'],
                commentBy: (property.message as PropertyStruct).sellerId == req['userId'] ? ReplyBy.OWNER : ReplyBy.USER,
                isAnonymous: req.body.isAnonymous || false
            };

            const entry: CommentsStruct = await this.CommentsModel.create(obj);
            if (!entry?.uniqueId) {
                this.logger.error("Failed to create comment.");
                return { message: "Failed to create comment.", flag: false };
            }

            return { message: "Comment created successfully.", flag: true }
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async replyOnComment(req: Request, res: Response)
        : Promise<{ message: string, flag: boolean }> {
        try {
            const entry: CommentsStruct = await this.CommentsModel.findOne({ uniqueId: req.body.uniqueId });
            if (!entry?.uniqueId) {
                return { message: "Comment not found.", flag: false };
            }

            const property = await Container.get(PropertyService)
                .getSingleProperty({ uniqueId: entry.propertyId, status: PropertyStatus.ACTIVE });
            if (!property.flag) {
                return { message: property.message.toString(), flag: false };
            }

            if ((property.message as PropertyStruct).sellerId !== req['userId']) {
                return { message: "Only property owner can reply.", flag: false };
            }

            const obj: ReplyStruct = {
                text: req.body.text,
                replyBy: ReplyBy.OWNER,
                replier: req['userId'],
                replyAt: (new Date().getTime()).toString()
            }

            await this.CommentsModel.findOneAndUpdate({ uniqueId: entry.uniqueId }, {
                $set: {
                    reply: obj
                }
            }, { new: true });

            return { message: "Reply created successfully.", flag: true }
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async commentsBasedOnProperty(req: Request, res: Response)
        : Promise<{ message: string | CommentsStruct[], flag: boolean }> {
        try {
            const aggregate = [
                {
                    $match: {
                        propertyId: req.query.propertyId
                    }
                },
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
                    $addFields: {
                        userName: "$user.name",
                        userProfile: "$user.profile",
                        userIsVerified: "$user.isVerified"
                    }
                },
                {
                    $project: {
                        user: 0,
                    }
                }
            ];

            const query = await this.CommentsModel.aggregate(aggregate);

            return { message: query, flag: true }
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }
}