import { celebrate, Joi } from 'celebrate';
import { Router, Request, Response } from 'express';
import Container from 'typedi';
import middlewares from '../middlewares';
import ReportAdsService from '@/services/reportAdsService';
import { ReportOptions } from '@/interfaces/reportAds';
const route = Router();

export default (app: Router) => {

  app.use('/report', route);

  /**
   * @swagger
   * /report/report_ad:
   *   post:
   *     summary: Report ads
   *     tags:
   *       - ReportAds
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
   *               - propertyId
   *               - remark
   *               - option
   *             properties:
   *               propertyId:
   *                 type: string
   *               remark:
   *                 type: string
   *               option:
   *                 type: string
   *     responses:
   *       200:
   *         description: Report added
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   */
  route.post('/report_ad', middlewares.checkToken, celebrate({
    body: Joi.object({
      propertyId: Joi.string().required(),
      remark: Joi.string().required(),
      option: Joi.string().required().valid(...Object.values(ReportOptions)),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string, flag: boolean } = await Container.get(ReportAdsService)
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
    const result: { message: string | any, flag: boolean } = await Container.get(ReportAdsService)
      .getAllList(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });
};
