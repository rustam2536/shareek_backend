import Container, { Inject, Service } from "typedi";
import { Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid';
import crypto from "crypto";
import { IUser, LoginStatus } from "@/interfaces/IUser";
import { LoginLogs } from "@/interfaces/logs/loginLogs";
import Common from "../commonService";

const parser = require('ua-parser-js');
const geoip = require('geoip-lite');


@Service()
export default class LoginLogsService {

  constructor(@Inject('logger') private logger,
    @Inject('loginLogModel') private loginLogs: Models.LoginLogsModel
  ) { }

  public async createLogsAndLogin(req: Request, res: Response, user: IUser)
    : Promise<{ message: string | LoginLogs, flag: boolean }> {
    try {
      let hash = crypto.pbkdf2Sync(req.body.password, user.salt, 1000,
        64, `sha512`).toString(`hex`);
      if (hash !== user.password) {
        return { message: 'Invalid Password', flag: false };
      }
      let loginStatus = LoginStatus.SUCCESS;
      let message = 'Login Successfull.';

      let createdLogs: { message: string | LoginLogs, flag: boolean } = await this.createLog(req, res,
        {
          user: user, message: message,
          status: loginStatus
        });

      if (!createdLogs.flag) {
        return { message: createdLogs.message.toString(), flag: false }
      }

      return { message: createdLogs.message, flag: true };
    } catch (e) {
      this.logger.error(`Error when user ${req.body.email} tried to login: ${e.message}`)
      return { flag: false, message: e.message };
    }
  }

  public async createLog(req: Request, res: Response, filters: {
    user: IUser,
    message: string, status: string
  }): Promise<{ message: string | LoginLogs, flag: boolean }> {
    try {
      let obj: LoginLogs = {
        browser: "",
        city: "",
        country: "",
        createdAt: new Date().getTime(),
        userId: filters.user.uniqueId,
        ip: req.connection.remoteAddress,
        lat: req.body?.lat ? req.body?.lat : "",
        long: req.body?.long ? req.body?.long : "",
        os: "",
        status: filters.status,
        timezone: "",
        loginTime: new Date().getTime(),
        message: filters.message,
        salt: crypto.randomBytes(16).toString('hex'),
        uniqueId: Container.get(Common).generateUniqueID(process.env.LOGIN_LOGS_PREFIX)
      };
      let parse = parser(req.headers['user-agent']);

      const geo = geoip.lookup(obj.ip);

      if (parse) {
        obj.os = parse.os.name || "";
        obj.browser = parse.browser.name || "";
      }
      if (geo) {
        obj.lat = geo.ll[0];
        obj.long = geo.ll[1];
        obj.city = geo.city;
        obj.country = geo.country;
        obj.timezone = geo.timezone;
      }
      let createdLogs: LoginLogs = await this.loginLogs.create(obj);
      if (!createdLogs) {
        return { flag: false, message: "Failed to create logs" };
      }
      return { message: createdLogs, flag: true };
    } catch (e) {
      this.logger.error(e.message);
      return { flag: false, message: e.message };
    }
  }

  public async getLogBasedOnFilters(filters: object)
    : Promise<{ message: LoginLogs | string, flag: boolean }> {
    try {
      const log: LoginLogs = await this.loginLogs.findOne(filters);
      if (!log?.userId) {
        return { message: 'Session expired, Please login again.', flag: false };
      }
      return { message: log, flag: true };
    } catch (e) {
      this.logger.error(e.message);
      return { flag: false, message: e.message };
    }
  }

  public async updateLogBasedOnFilters(filters: {
    cond: object, value: object,
    type: string
  }): Promise<{ message: LoginLogs | string, flag: boolean }> {
    try {
      if (filters.type === "single") {
        await this.loginLogs.updateOne(filters.cond, { $set: filters.value });
      } else {
        await this.loginLogs.updateMany(filters.cond, { $set: filters.value });
      }
      return { message: "Logs updated successfully.", flag: true };
    } catch (e) {
      this.logger.error(e.message);
      return { flag: false, message: e.message };
    }
  }

  public async logoutAllDevices(filters: {
    userId: string
  }): Promise<{ message: LoginLogs | string, flag: boolean }> {
    try {
      await this.loginLogs.updateMany({ userId: filters.userId, status: LoginStatus.SUCCESS },
        { $set: { salt: "", status: LoginStatus.LOGOUT } });
      return { message: "Logs updated successfully.", flag: true };
    } catch (e) {
      this.logger.error(e.message);
      return { flag: false, message: e.message };
    }
  }

  public async logoutDevices(req: Request, res: Response)
    : Promise<{ message: LoginLogs | string, flag: boolean }> {
    try {
      await this.loginLogs.updateOne({
        userId: req['userId'],
        uniqueId: req.headers['sessionid'].toString(),
        status: LoginStatus.SUCCESS
      },
        { $set: { salt: "", status: LoginStatus.LOGOUT } });
      return { message: "Logs updated successfully.", flag: true };
    } catch (e) {
      this.logger.error(e.message);
      return { flag: false, message: e.message };
    }
  }

}
