import CountryService from '@/services/countryService';
import { celebrate, Joi } from 'celebrate';
import { Router, Request, Response } from 'express';
import Container from 'typedi';
import middlewares from '../middlewares';

const route = Router();

export default (app: Router) => {

  app.use('/countries', route);

  /**
   * @swagger
   * /countries/list:
   *   get:
   *     summary: Get allowed country list
   *     tags:
   *       - Countries
   *     responses:
   *       200:
   *         description: Allowed countries fetched successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       name:
   *                         type: string
   *                       icon:
   *                         type: string
   *                       code:
   *                         type: string
   */
  route.get('/list', async (req: Request, res: Response) => {
    const result = await Container.get(CountryService).getAllowedCountries(req, res);
    return res.status(200).json({
      success: result.flag,
      message: result.flag ? "Success" : result.message,
      data: result.flag ? result.message : []
    });
  });

  /**
   * @swagger
   * /countries/toggle:
   *   post:
   *     summary: Toggle country allowed status (Admin only)
   *     tags:
   *       - Countries
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
   *               - name
   *               - isAllowed
   *             properties:
   *               name:
   *                 type: string
   *               isAllowed:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Country updated successfully
   */
  route.post('/admin/toggle', middlewares.checkToken, middlewares.checkIsAdmin, celebrate({
    body: Joi.object({
      uniqueId: Joi.string().required(),
      isAllowed: Joi.boolean().required(),
    }),
  }), async (req: Request, res: Response) => {
    const result = await Container.get(CountryService).toggleCountry(req, res);
    return res.status(200).json({
      success: result.flag,
      message: result.flag ? "Country updated successfully" : result.message,
      data: result.flag ? result.message : {}
    });
  });

  route.get('/admin/list', middlewares.checkToken, middlewares.checkIsAdmin, async (req: Request, res: Response) => {
    const result = await Container.get(CountryService).getAllList(req, res);
    return res.status(200).json({
      success: result.flag,
      message: result.flag ? "Success" : result.message,
      data: result.flag ? result.message : []
    });
  });

};
