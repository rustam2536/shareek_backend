import { Container, Inject, Service } from "typedi";
import { Request, Response } from "express";
import Common from "@/services/commonService";
import { CategoryStruct, CategoryNames } from "@/interfaces/category";


@Service()
export default class CategoryService {

    constructor(
        @Inject('logger') private logger,
        @Inject('categoryModel') private CategoryModel: Models.CategoryModel
    ) {
    }

    public async createCategory(req: Request, res: Response)
        : Promise<{ message: string | CategoryStruct, flag: boolean }> {
        try {
            const obj: CategoryStruct = {
                ...req.body,
                uniqueId: Container.get(Common).generateUniqueID(process.env.CATEGORY_PREFIX),
            };

            const entry: CategoryStruct = await this.CategoryModel.create(obj);
            if (!entry?.uniqueId) {
                this.logger.error("Failed to create category.");
                return { message: "Failed to create category.", flag: false };
            }

            return { message: entry, flag: true }
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getCategoryBasedOnFilter(filters: { uniqueId?: string, name?: CategoryNames })
        : Promise<{ message: string | CategoryStruct, flag: boolean }> {
        try {
            let query = await this.CategoryModel.findOne(filters);
            if (!query) {
                return { message: "Invalid Category.", flag: false };
            }

            return { message: query, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getCategoryList(req: Request, res: Response)
        : Promise<{ message: string | CategoryStruct[], flag: boolean }> {
        try {
            let query = await this.CategoryModel.find();

            return { message: query, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }
}