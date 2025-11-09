import { celebrate, Joi } from 'celebrate';
import { Router, Request, Response } from 'express';
import Container from 'typedi';
import middlewares from '../middlewares';
import ReportUserService from '@/services/reportUserService';
import { ReportUserStruct } from '@/interfaces/reportUser';
const route = Router();

export default (app: Router) => {

  app.use('/report_user', route);

  /**
   * @swagger
   * /report_user/report:
   *   post:
   *     summary: Report User
   *     tags:
   *       - ReportUser
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - roomId
   *             properties:
   *               roomId:
   *                 type: string
   *               remark:
   *                 type: string
   *     responses:
   *       200:
   *         description: Report added
   */
  route.post('/report', middlewares.checkToken, celebrate({
    body: Joi.object({
      roomId: Joi.string().required(),
      remark: Joi.string().allow("").allow(null),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string, flag: boolean } = await Container.get(ReportUserService)
      .createEntry(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  route.get('/admin/list', middlewares.checkToken, middlewares.checkIsAdmin, celebrate({
    query: Joi.object({
      page: Joi.string().required(),
      searchTerm: Joi.string().allow("").allow(null),
    }),
  }), async (req: Request, res: Response) => {
    const results: { message: string | { data: ReportUserStruct[], totalCount: number }, flag: boolean } = await Container.get(ReportUserService)
      .getAllList(req, res);
    if (results.flag) {
      return res.status(200).json({ success: true, message: "Success", data: results.message });
    } else {
      return res.status(200).json({ success: false, message: results.message });
    }
  });
};
