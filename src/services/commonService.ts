import { Container, Inject, Service } from "typedi";
import jwt from "jsonwebtoken";
import { IUser, LoginStatus } from "@/interfaces/IUser";
import { v4 as uuidv4 } from 'uuid';
import { LoginLogs } from "@/interfaces/logs/loginLogs";
import LoginLogsService from "./logs/loginLogsService";

@Service()
export default class Common {

  constructor(
    @Inject("logger") private logger
  ) {
  }

  public generateJSONToken(user: IUser, salt?: string): string {
    // Token is valid for 1 hour...
    // return jwt.sign({data: user.email},
    //   process.env.TOKEN_SECRET,{expiresIn: '5s'});
    // return jwt.sign({data: user.email, exp: Math.floor(Date.now() / 1000) + (60 * 60)},
    //   process.env.TOKEN_SECRET);
    return jwt.sign({ data: user.uniqueId },
      salt ? salt : user.salt, { expiresIn: "10d" });
  }

  public async verifyJSONToken(filters: { token: string, sessionId: string }): Promise<{ message: string, flag: boolean }> {
    try {
      const session: { message: LoginLogs | string, flag: boolean } = await Container.get(LoginLogsService)
        .getLogBasedOnFilters({ uniqueId: filters.sessionId, status: LoginStatus.SUCCESS });

      if (!session.flag) {
        return { message: session.message.toString(), flag: false };
      }
      let verify = jwt.verify(filters.token, session.message['salt']);
      // @ts-ignore
      return { flag: true, message: verify.data };
    } catch (e) {
      if (e.message === "jwt expired" || e.message === "invalid signature") {
        e.message = "Session Expired(jwt), Please Login to continue.";
      }
      return { flag: false, message: e.message };
    }
  }

  public async abortTransaction(session: any) {
    try {
      await session.abortTransaction();
      await session.endSession();
    } catch (e) {
      console.log(`Error during aborting transaction, message is ${e.message}`);
    }
  }

  getDateAndTime(): string {
    let currentDate = new Date();
    return currentDate.getDate() + "/"
      + (currentDate.getMonth() + 1) + "/"
      + currentDate.getFullYear() + " @ "
      + currentDate.getHours() + ":"
      + currentDate.getMinutes() + ":"
      + currentDate.getSeconds();
  }

  public checkErrResp(error): string {
    if (error.response) {
      return this.stringify(error.response.data);
    } else if (error.request) {
      return this.stringify(error.request);
    } else if (error.response_message) {
      return this.stringify(error);
    } else {
      return error.message ? error.message : this.stringify(error);
    }
  }

  public checkForDownTime(filters: { startMaintainHour: Date, endMaintainHour: Date })
    : { message: string, flag: boolean } {
    let currentD = new Date();
    if (currentD >= filters.startMaintainHour && currentD < filters.endMaintainHour) {
      return { message: "We are down.", flag: false };
    }
    return { message: "We are free to go.", flag: true };
  }

  public stringify(obj): string {
    let cache = [];
    let str = JSON.stringify(obj, function (key, value) {
      if (typeof value === "object" && value !== null) {
        if (cache.indexOf(value) !== -1) {
          // Circular reference found, discard key
          return;
        }
        // Store value in our collection
        cache.push(value);
      }
      return value;
    });
    cache = null; // reset the cache
    return str;
  }

  public generateUniqueID(prefix: string): string {
    const timestamp = new Date().getTime();
    const uuidSegment = uuidv4();
    return `${prefix}${timestamp}${uuidSegment.slice(uuidSegment.length - 7,
      uuidSegment.length).toUpperCase()}`;
  }

  public generateUniqueIdNumber(prefix: string): string {
    const timestamp = new Date().getTime();
    const randomSegment = Math.floor(Math.random() * 1000000); // Generate a 7-digit random number
    return `1${timestamp.toString().slice(5)}${randomSegment}9`; //${prefix}
  }

  public formatDateTime(isoDate: string): string {
    const inputDate = new Date(isoDate)
      .toLocaleString(undefined, { timeZone: 'Asia/Kolkata' })
      .replace(',', '');
    var parts = inputDate.split('/');
    if (parts.length !== 3) {
      return 'Invalid date format';
    }
    var day = parts[1];
    var month = parts[0];
    var year = parts[2];
    // Add leading zeros to day and month if needed
    day = day.padStart(2, '0');
    month = month.padStart(2, '0');
    const date = day + '/' + month + '/' + year;
    return date;
  }
}
