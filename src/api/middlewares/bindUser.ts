import { Container } from "typedi";
import { Request, Response, NextFunction } from "express";
import { Logger } from 'winston';
import Common from "@/services/commonService";

/**
 * Middleware to optionally bind a user to the request if a valid token and session ID are provided.
 * 
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 */
const bindUser = async (req: Request, res: Response, next: NextFunction) => {
  const logger: Logger = Container.get('logger');

  try {
    const authHeader = req.get('Authorization');
    const sessionId = req.headers['sessionid'];

    // If either token or sessionId is missing, skip user binding
    if (!authHeader || !sessionId) {
      return next();
    }

    const token = authHeader.split(' ')[1]; // 'Bearer <token>'
    
    if (!token) {
      return next();
    }

    const result: { message: string, flag: boolean } = await Container.get(Common).verifyJSONToken({
      token: token,
      sessionId: sessionId.toString(),
    });    
    
    if (result.flag) {
      req['userId'] = String(result.message);
    }

    return next();
  } catch (error) {
    logger.error(`bindUser error: ${error.message}`);
    return next(); // Don’t block the request; binding is optional
  }
};

export default bindUser;
