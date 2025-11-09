import { Container, Inject, Service } from "typedi";
import { Request, Response } from "express";
import Common from "@/services/commonService";
import { ReportUserStruct } from "@/interfaces/reportUser";
import UserService from "./userService";
import { IUser } from "@/interfaces/IUser";
import ChatService from "./chatService";
import { ChatMessageStruct } from "@/interfaces/chat";

@Service()
export default class ReportUserService {

    constructor(
        @Inject('logger') private logger,
        @Inject('reportUserModel') private ReportUserModel: Models.ReportUserModel
    ) {
    }

    public async createEntry(req: Request, res: Response)
        : Promise<{ message: string, flag: boolean }> {
        try {
            const { roomId, remark } = req.body;

            const msgs: { message: ChatMessageStruct[] | string, flag: boolean } = await Container.get(ChatService)
                .getMessagesByRoomId(roomId);

            if (!msgs.flag) {
                return { message: "There is no messages yet.", flag: false };
            }

            if (typeof msgs.message === 'object') {
                const obj: ReportUserStruct = {
                    uniqueId: Container.get(Common).generateUniqueID(process.env.REPORT_USER_PREFIX),
                    reporterId: req['userId'],
                    userId: msgs.message[0].senderId == req['userId'] ? msgs.message[0].receiverId : msgs.message[0].senderId,
                    remark: remark || "",
                    chats: JSON.stringify(msgs.message)
                };

                const entry: ReportUserStruct = await this.ReportUserModel.create(obj);
                if (!entry?.uniqueId) {
                    this.logger.error("Failed to report User.");
                    return { message: "Failed to report User.", flag: false };
                }

                return { message: "User has been reported successfully.", flag: true }
            }
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getEntry(filters: { userId: string, reporterId: string })
        : Promise<{ message: string | ReportUserStruct, flag: boolean }> {
        try {
            const entry: ReportUserStruct = await this.ReportUserModel.findOne({ reporterId: filters.reporterId, userId: filters.userId });
            if (!entry?.uniqueId) {
                // this.logger.error("Failed to report User.");
                return { message: "Failed to get report User.", flag: false };
            }

            return { message: entry, flag: true }
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getAllList(req: Request, res: Response)
        : Promise<{ message: string | { data: ReportUserStruct[], totalCount: number }, flag: boolean }> {
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
                }
            }, flag = false;

            if (searchTerm) {
                matchObj.$match.$or.push(
                    { userId: { $regex: searchTerm, $options: 'i' } },
                    { reporterId: { $regex: searchTerm, $options: 'i' } },
                );
                flag = true;
            } else {
                delete matchObj.$match.$or;
            }

            if (flag) {
                obj.$facet.data.push(matchObj);
                // @ts-ignore
                obj.$facet.totalCount.splice(0, 0, matchObj);
            }

            if (+page < 1) {
                obj.$facet.data.push({ $sort: { createdAt: -1 } });
            } else {
                let skip = (+page - 1) * +process.env.LIMIT;
                obj.$facet.data.push({ $sort: { createdAt: -1 } });
                obj.$facet.data.push({ $skip: skip });
                obj.$facet.data.push({ $limit: +process.env.LIMIT });
                obj.$facet.data.push(
                    {
                        $lookup: {
                            from: "users",
                            localField: "userId",
                            foreignField: "uniqueId",
                            as: "user"
                        }
                    },
                    {
                        $unwind: "$user"
                    },
                    {
                        $addFields: {
                            userName: "$user.name",
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "reporterId",
                            foreignField: "uniqueId",
                            as: "reporter"
                        }
                    },
                    {
                        $unwind: "$reporter"
                    },
                    {
                        $addFields: {
                            reporterName: "$reporter.name",
                        }
                    },
                    {
                        $project: {
                            reporter: 0,
                            user: 0,
                        }
                    },
                );
            }
            aggregate.push(obj);

            let query = await this.ReportUserModel.aggregate(aggregate);
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

}