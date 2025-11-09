import { Container } from "typedi";
import { Request } from "express";
import { IUser, UserRole } from "@/interfaces/IUser";
import UserService from "@/services/userService";


/**
 * @param {*} req Express req Object
 * @param {*} res  Express res Object
 * @param {*} next  Express next Function
 */
const checkIsAdmin = async (req: Request, res, next) => {
  try {
    const result: { message: string | IUser, flag: boolean } = await Container.get(UserService)
      .getUserDetails(req, res);
    if (result.flag) {
      if (result.message['role'] === UserRole.ADMIN) {
        req['role'] = UserRole.ADMIN;
        next();
      } else {
        return res.status(200).json({ success: false, message: "Users cannot call admin API." });
      }
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  } catch (e) {
    return next(e);
  }
}

export default checkIsAdmin;
