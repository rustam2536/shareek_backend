import { Container, Inject, Service } from "typedi";
import { Request, Response } from "express";
import Common from "@/services/commonService";
import { CountryStruct } from "@/interfaces/country";

@Service()
export default class CountryService {

    constructor(
        @Inject('logger') private logger,
        @Inject('countryModel') private countryModel: Models.CountryModel
    ) {
    }

    public async createEntry(req: Request, res: Response)
        : Promise<{ message: string, flag: boolean }> {
        try {

            const seedCountries: CountryStruct[] = [
                { name: 'Saudi Arabia', icon: 'sa.svg', isoCode: 'SA', iso2code: 'SA', code: '+966', uniqueId: Container.get(Common).generateUniqueID(process.env.COUNTRY_PREFIX) },
                { name: 'United Arab Emirates', icon: 'ae.svg', isoCode: 'AE', iso2code: 'AE', code: '+971', uniqueId: Container.get(Common).generateUniqueID(process.env.COUNTRY_PREFIX) },
                { name: 'Bahrain', icon: 'bh.svg', isoCode: 'BH', iso2code: 'BH', code: '+973', uniqueId: Container.get(Common).generateUniqueID(process.env.COUNTRY_PREFIX) },
                { name: 'Kuwait', icon: 'kw.svg', isoCode: 'KW', iso2code: 'KW', code: '+965', uniqueId: Container.get(Common).generateUniqueID(process.env.COUNTRY_PREFIX) },
                { name: 'Oman', icon: 'om.svg', isoCode: 'OM', iso2code: 'OM', code: '+968', uniqueId: Container.get(Common).generateUniqueID(process.env.COUNTRY_PREFIX) },
                { name: 'Qatar', icon: 'qa.svg', isoCode: 'QA', iso2code: 'QA', code: '+974', uniqueId: Container.get(Common).generateUniqueID(process.env.COUNTRY_PREFIX) },
                { name: 'India', icon: 'in.svg', isoCode: 'IN', iso2code: 'IN', code: '+91', uniqueId: Container.get(Common).generateUniqueID(process.env.COUNTRY_PREFIX) },
                { name: 'United Kingdom', icon: 'gb.svg', isoCode: 'GB', iso2code: 'GB', code: '+44', uniqueId: Container.get(Common).generateUniqueID(process.env.COUNTRY_PREFIX) },
                { name: 'United States', icon: 'us.svg', isoCode: 'US', iso2code: 'US', code: '+1', uniqueId: Container.get(Common).generateUniqueID(process.env.COUNTRY_PREFIX) },
            ];

            await this.countryModel.insertMany(seedCountries);

            return { message: "Created", flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getAllowedCountries(req: Request, res: Response)
        : Promise<{ message: string | any, flag: boolean }> {
        try {
            const countries = await this.countryModel.find({ isAllowed: true });
            return { message: countries, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getAllList(req: Request, res: Response)
        : Promise<{ message: string | any, flag: boolean }> {
        try {
            const countries = await this.countryModel.find();
            return { message: countries, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async getSingleCountry(name: string)
        : Promise<{ message: string | CountryStruct, flag: boolean }> {
        try {
            const countries = await this.countryModel.findOne({
                name: { $regex: new RegExp(`^${name}$`, "i") }
            });

            if (!countries) {
                return { message: "Country is not allowed.", flag: false };
            }
            return { message: countries, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

    public async toggleCountry(req: Request, res: Response)
        : Promise<{ message: string | any, flag: boolean }> {
        try {
            const { uniqueId, isAllowed } = req.body;
            const updated = await this.countryModel.findOneAndUpdate(
                { uniqueId: uniqueId },
                { isAllowed },
                { new: true }
            );
            if (!updated) return { message: "Country not found", flag: false };
            return { message: updated, flag: true };
        } catch (e) {
            this.logger.error(e.message);
            return { message: e.message, flag: false };
        }
    }

}