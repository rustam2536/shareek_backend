import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { CategoryStruct } from '@/interfaces/category';
import CategoryService from '@/services/categoryService';
const route = Router();

export default (app: Router) => {

  app.use('/category', route);

  /**
   * @swagger
   * /category/get_list:
   *   get:
   *     summary: Get list of categories
   *     tags:
   *       - Category
   *     responses:
   *       200:
   *         description: A list of categories
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: Success
   *                 data:
   *                   type: array
   *                   example: []
   */
  route.get('/get_list', async (req: Request, res: Response) => {
    const result: { message: string | CategoryStruct[], flag: boolean } = await Container.get(CategoryService)
      .getCategoryList(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });
};
