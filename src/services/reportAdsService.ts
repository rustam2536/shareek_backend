import { Container, Inject, Service } from "typedi";
import { Request, Response } from "express";
import Common from "@/services/commonService";
import { ReportAdsStruct } from "@/interfaces/reportAds";

@Service()
export default class ReportAdsService {

    constructor(
        @Inject('logger') private logger,
        @Inject('reportAdsModel') private ReportAdsModel: Models.ReportAdsModel
    ) {
    }

    public async createEntry(req: Request, res: Response)
        : Promise<{ message: string, flag: boolean }> {
        try {
            const obj: ReportAdsStruct = {
                ...req.body,
                uniqueId: Container.get(Common).generateUniqueID(process.env.REPORT_PREFIX),
                userId: req['userId'],
            };

            const entry: ReportAdsStruct = await this.ReportAdsModel.create(obj);
            if (!entry?.uniqueId) {
                this.logger.error("Failed to report Ad.");
                return { message: "Failed to report Ad.", flag: false };
            }

            return { message: "Ad has been reported successfully.", flag: true }
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getAllList(req: Request, res: Response)
        : Promise<{ message: string | { data: ReportAdsStruct[], totalCount: number }, flag: boolean }> {
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
                    { propertyId: { $regex: searchTerm, $options: 'i' } },
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
                        $project: {
                            user: 0,
                        }
                    },
                );
            }
            aggregate.push(obj);

            let query = await this.ReportAdsModel.aggregate(aggregate);
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