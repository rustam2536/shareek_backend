import { celebrate, Joi } from 'celebrate';
import { Router, Request, Response } from 'express';
import Container from 'typedi';
import middlewares from '../middlewares';
import FirebaseService from '@/services/firebaseService';
import { NotificationType } from '@/interfaces/notification';

const route = Router();

export default (app: Router) => {
  app.use('/notification', route);

  /**
   * @swagger
   * /notification/send:
   *   post:
   *     summary: Send notification to a single device
   *     tags:
   *       - Notifications
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
   *               - receiverId
   *               - title
   *               - body
   *             properties:
   *               receiverId:
   *                 type: string
   *               title:
   *                 type: string
   *               body:
   *                 type: string
   *     responses:
   *       200:
   *         description: Notification sent
   */
  route.post('/send', middlewares.checkToken, middlewares.checkIsAdmin, celebrate({
    body: Joi.object({
      title: Joi.string().required(),
      body: Joi.string().required(),
      receiverId: Joi.string().required(),
    }),
  }), async (req: Request, res: Response) => {
    const { title, body, receiverId } = req.body;
    const result = await Container.get(FirebaseService)
      .sendNotification({ title, body, receiverId: receiverId, type: NotificationType.SYSTEM });
    return res.status(200).json({ success: result.flag, message: result.message });
  });

  /**
   * @swagger
   * /notification/send-multiple:
   *   post:
   *     summary: Send notification to multiple devices
   *     tags:
   *       - Notifications
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
   *               - receiverId
   *               - title
   *               - body
   *             properties:
   *               receiverId:
   *                 type: array
   *                 items:
   *                   type: string
   *               title:
   *                 type: string
   *               body:
   *                 type: string
   *     responses:
   *       200:
   *         description: Notifications sent
   */
  route.post('/send-multiple', middlewares.checkToken, middlewares.checkIsAdmin, celebrate({
    body: Joi.object({
      receiverIds: Joi.array().items(Joi.string()).required(),
      title: Joi.string().required(),
      body: Joi.string().required(),
    }),
  }), async (req: Request, res: Response) => {
    const { receiverIds, title, body } = req.body;
    const result = await Container.get(FirebaseService).sendNotifications({ receiverIds, title, body });
    return res.status(200).json({ success: result.flag, message: result.message });
  });

  /**
   * @swagger
   * /notification/send-topic:
   *   post:
   *     summary: Send notification to a topic
   *     tags:
   *       - Notifications
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
   *               - title
   *               - body
   *             properties:
   *               title:
   *                 type: string
   *               body:
   *                 type: string
   *     responses:
   *       200:
   *         description: Topic notification sent
   */
  route.post('/send-topic', middlewares.checkToken, middlewares.checkIsAdmin, celebrate({
    body: Joi.object({
      // topic: Joi.string().required(),
      title: Joi.string().required(),
      body: Joi.string().required(),
    }),
  }), async (req: Request, res: Response) => {
    const { title, body } = req.body;
    const result = await Container.get(FirebaseService).sendTopicNotification(title, body);
    return res.status(200).json({ success: result.flag, message: result.message });
  });

  /**
   * @swagger
   * /notification/subscribe:
   *   post:
   *     summary: Subscribe a device token to a topic
   *     tags:
   *       - Notifications
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
   *               - token
   *             properties:
   *               token:
   *                 type: string
   *     responses:
   *       200:
   *         description: Token subscribed to topic
   */
  route.post('/subscribe', middlewares.checkToken, celebrate({
    body: Joi.object({
      token: Joi.string().required(),
      // topic: Joi.string().required(),
    }),
  }), async (req: Request, res: Response) => {
    const result = await Container.get(FirebaseService).subscribeToTopic(req, res);
    return res.status(200).json({ success: result.flag, message: result.message });
  });

  /**
   * @swagger
   * /notification/unsubscribe:
   *   post:
   *     summary: Unsubscribe a device token from a topic
   *     tags:
   *       - Notifications
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
   *               - token
   *             properties:
   *               token:
   *                 type: string
   *     responses:
   *       200:
   *         description: Token unsubscribed from topic
   */
  route.post('/unsubscribe', middlewares.checkToken, celebrate({
    body: Joi.object({
      token: Joi.string().required(),
      // topic: Joi.string().required(),
    }),
  }), async (req: Request, res: Response) => {
    const { token } = req.body;
    const result = await Container.get(FirebaseService).unsubscribeFromTopic(token);
    return res.status(200).json({ success: result.flag, message: result.message });
  });

  /**
   * @swagger
   * /notification/list:
   *   get:
   *     summary: Notification List
   *     tags:
   *       - Notifications
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     responses:
   *       200:
   *         description: success
   */
  route.get('/list', middlewares.checkToken, async (req: Request, res: Response) => {
    const result = await Container.get(FirebaseService).getNotifications(req, res);
    return res.status(200).json({
      success: result.flag,
      message: result.flag ? 'Success.' : 'Failed',
      data: result.message
    });
  });

  /**
   * @swagger
   * /notification/admin/list:
   *   get:
   *     summary: Notification List
   *     tags:
   *       - Notifications
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     responses:
   *       200:
   *         description: success
   */
  route.get('/admin/list', middlewares.checkToken, middlewares.checkIsAdmin, celebrate({
    query: Joi.object({
      page: Joi.string().required(),
      searchTerm: Joi.string().allow("").allow(null),
    }),
  }),
    async (req: Request, res: Response) => {
      const result = await Container.get(FirebaseService).getNotificationList(req, res);
      return res.status(200).json({
        success: result.flag,
        message: result.flag ? 'Success.' : 'Failed',
        data: result.message
      });
    });

  /**
   * @swagger
   * /notification/delete:
   *   post:
   *     summary: Delete Notification
   *     tags:
   *       - Notifications
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
   *               - id
   *             properties:
   *               id:
   *                 type: string
   *     responses:
   *       200:
   *         description: Deleted successfully
   */
  route.post('/delete', middlewares.checkToken, celebrate({
    body: Joi.object({
      id: Joi.string().required(),
    }),
  }), async (req: Request, res: Response) => {

    const result = await Container.get(FirebaseService).markDelete(req, res);
    return res.status(200).json({ success: result.flag, message: result.message });
  });

  /**
   * @swagger
   * /notification/seen:
   *   post:
   *     summary: Seen Notification
   *     tags:
   *       - Notifications
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
   *               - id
   *             properties:
   *               id:
   *                 type: string
   *     responses:
   *       200:
   *         description: Deleted successfully
   */
  route.post('/seen', middlewares.checkToken, celebrate({
    body: Joi.object({
      id: Joi.string().required(),
    }),
  }), async (req: Request, res: Response) => {

    const result = await Container.get(FirebaseService).markSeen(req, res);
    return res.status(200).json({ success: result.flag, message: result.message });
  });
};
