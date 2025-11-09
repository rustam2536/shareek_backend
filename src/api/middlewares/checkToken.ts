import { Container } from "typedi";
import { Request } from "express";
import { Logger } from 'winston';
import Common from "@/services/commonService";

/**
 * @param {*} req Express req Object
 * @param {*} res  Express res Object
 * @param {*} next  Express next Function
 */
const checkToken = async (req: Request, res, next) => {
  const Logger: Logger = Container.get('logger');
  try {
    const authHeader = req.get('Authorization');
    const token = authHeader && authHeader.toString().split(' ')[1];

    if (!token) {
      Logger.error(`Token not found.`);
      return res.status(200).json({ success: false, message: "Token not found." });
    }

    if (!req.headers['sessionid']) {
      Logger.error(`Session Id not found.`);
      return res.status(200).json({ success: false, message: "Session Id not found." });
    }
    let result: { message: string, flag: boolean } = await Container.get(Common).verifyJSONToken({
      token: token,
      sessionId: req.headers['sessionid'].toString()
    });
    if (result.flag) {
      req['userId'] = String(result.message);

      next();
    } else {
      Logger.error(result.message);
      return res.status(200).json({ success: false, message: result.message });
    }
  } catch (e) {
    Logger.error(e.message);
    return next(e);
  }
}

export default checkToken;
