import CommentService from '@/services/commentsService';
import { celebrate, Joi } from 'celebrate';
import { Router, Request, Response } from 'express';
import Container from 'typedi';
import middlewares from '../middlewares';
import { CommentsStruct } from '@/interfaces/comments';
const route = Router();

export default (app: Router) => {

  app.use('/comment', route);

  /**
   * @swagger
   * /comment/create_comment:
   *   post:
   *     summary: Create a new comment
   *     tags:
   *       - Comments
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
   *               - uniqueId
   *               - text
   *             properties:
   *               uniqueId:
   *                 type: string
   *               text:
   *                 type: string
   *               isAnonymous:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Comment created successfully or error message
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
  route.post('/create_comment', middlewares.checkToken, celebrate({
    body: Joi.object({
      uniqueId: Joi.string().required(),
      text: Joi.string().required(),
      isAnonymous: Joi.boolean().allow("").allow(null),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string, flag: boolean } = await Container.get(CommentService)
      .createComment(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /comment/reply:
   *   post:
   *     summary: Reply on comment
   *     tags:
   *       - Comments
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
   *               - uniqueId
   *               - text
   *             properties:
   *               uniqueId:
   *                 type: string
   *               text:
   *                 type: string
   *     responses:
   *       200:
   *         description: Reply created successfully or error message
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
  route.post('/reply', middlewares.checkToken, celebrate({
    body: Joi.object({
      uniqueId: Joi.string().required(),
      text: Joi.string().required(),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string, flag: boolean } = await Container.get(CommentService)
      .replyOnComment(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });
  /**
   * @swagger
   * /comment/comments_list:
   *   get:
   *     summary: Get all comments for a property
   *     tags:
   *       - Comments
   *     parameters:
   *       - in: query
   *         name: propertyId
   *         required: true
   *         schema:
   *           type: string
   *         description: Unique ID of the property
   *     responses:
   *       200:
   *         description: List of comments with optional replies
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
   *                   type: object
   */
  route.get('/comments_list', celebrate({
    query: Joi.object({
      propertyId: Joi.string().required(),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string | CommentsStruct[], flag: boolean } = await Container.get(CommentService)
      .commentsBasedOnProperty(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success.", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  }
  );
};
