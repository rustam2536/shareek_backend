import { Router, Request, Response } from 'express';
import { celebrate, Joi, Segments } from 'celebrate';
import Container from 'typedi';
import middlewares from '../middlewares';
import ChatService from '@/services/chatService';
import { MessageStatus } from '@/interfaces/chat';

const route = Router();

export default (app: Router) => {
  app.use('/chat', route);

  /**
   * @swagger
   * /chat/getRoomDetails:
   *   post:
   *     summary: Get a new chat room
   *     tags:
   *       - Chat
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               propertyId:
   *                 type: string
   *               otherUserId:
   *                 type: string
   *             required:
   *               - propertyId
   *               - otherUserId
   *     responses:
   *       200:
   *         description: Get a new Room 
   */
  route.post('/getRoomDetails', middlewares.checkToken,
    celebrate({
      [Segments.BODY]: Joi.object({
        propertyId: Joi.string().required(),
        otherUserId: Joi.string().required(),
        // message: Joi.string().allow("").allow(null)
      })
    }),
    async (req: Request, res: Response) => {
      const result = await Container.get(ChatService).createRoom(req, res);
      return res.status(200).json({
        success: result.flag,
        message: result.flag ? 'Room created successfully.' : result.message,
        ...(result.flag && { data: result.message })
      });
    }
  );

  /**
   * @swagger
   * /chat/send:
   *   post:
   *     summary: Send a message in an existing chat
   *     tags:
   *       - Chat
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               roomId:
   *                 type: string
   *               message:
   *                 type: string
   *               type:
   *                 type: string
   *                 enum: [text, image, file]
   *             required:
   *               - roomId
   *               - message
   *     responses:
   *       200:
   *         description: Message sent
   */
  route.post('/send', middlewares.checkToken, celebrate({
    [Segments.BODY]: Joi.object({
      roomId: Joi.string().required(),
      message: Joi.string().required(),
      type: Joi.string().allow("").allow(null).valid('text', 'image', 'file').default('text')
    })
  }), async (req: Request, res: Response) => {
    const result = await Container.get(ChatService).sendMessage(req, res);
    return res.status(200).json({
      success: result.flag,
      message: result.flag ? 'Message sent successfully' : result.message,
      // ...(result.flag && { data: result.message })
    });
  });

  /**
   * @swagger
   * /chat/list:
   *   get:
   *     summary: Get chat list
   *     tags:
   *       - Chat
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     responses:
   *       200:
   *         description: Chat list
   */
  route.get('/list', middlewares.checkToken,
    async (req: Request, res: Response) => {
      const result = await Container.get(ChatService).getChatList(req, res);
      return res.status(200).json({
        success: result.flag,
        message: result.flag ? 'Success' : result.message,
        ...(result.flag && { data: result.message })
      });
    }
  );

  /**
   * @swagger
   * /chat/messages:
   *   get:
   *     summary: Get all messages of a chat session
   *     tags:
   *       - Chat
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     parameters:
   *       - in: query
   *         name: roomId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: page
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of messages
   */
  route.get('/messages', middlewares.checkToken, celebrate({
    [Segments.QUERY]: Joi.object({
      roomId: Joi.string().required(),
      page: Joi.string().required(),
    })
  }), async (req: Request, res: Response) => {

    const result = await Container.get(ChatService).getMessages(req, res);

    return res.status(200).json({
      success: result.flag,
      message: result.flag ? 'Success' : result.message,
      ...(result.flag && { data: result.message })
    });
  });

  /**
   * @swagger
   * /chat/delete:
   *   post:
   *     summary: Delete chat
   *     tags:
   *       - Chat
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               roomIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["chat123", "chat456"]
   *             required:
   *               - roomIds
   *     responses:
   *       200:
   *         description: Chat deleted
   */
  route.post('/delete', middlewares.checkToken, celebrate({
    [Segments.BODY]: Joi.object({
      roomIds: Joi.array().items(Joi.string()).required(),
    })
  }), async (req: Request, res: Response) => {
    const result = await Container.get(ChatService).updateDeleteStatus(req, res);
    return res.status(200).json({
      success: result.flag,
      message: result.message,
      // ...(result.flag && { data: result.message })
    });
  });

  /**
   * @swagger
   * /chat/block:
   *   post:
   *     summary: Block room
   *     tags:
   *       - Chat
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               roomIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["chat123", "chat456"]
   *             required:
   *               - roomIds
   *     responses:
   *       200:
   *         description: Chat blocked
   */
  route.post('/block', middlewares.checkToken, celebrate({
    [Segments.BODY]: Joi.object({
      roomIds: Joi.array().items(Joi.string()).required(),
    })
  }), async (req: Request, res: Response) => {
    const result = await Container.get(ChatService).updateBlockStatus(req, res);
    return res.status(200).json({
      success: result.flag,
      message: result.message,
      // ...(result.flag && { data: result.message })
    });
  });

  /**
   * @swagger
   * /chat/important:
   *   post:
   *     summary: Important Chat
   *     tags:
   *       - Chat
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               roomIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["chat123", "chat456"]
   *               important:
   *                 type: boolean
   *             required:
   *               - roomIds
   *               - important
   *     responses:
   *       200:
   *         description: Chat important status updated
   */
  route.post('/important', middlewares.checkToken, celebrate({
    [Segments.BODY]: Joi.object({
      roomIds: Joi.array().items(Joi.string()).required(),
      important: Joi.boolean().required(),
    })
  }), async (req: Request, res: Response) => {
    const result = await Container.get(ChatService).updateImportantStatus(req, res);
    return res.status(200).json({
      success: result.flag,
      message: result.message,
      // ...(result.flag && { data: result.message })
    });
  });

  /**
   * @swagger
   * /chat/message_status:
   *   post:
   *     summary: Message Status
   *     tags:
   *       - Chat
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               roomId:
   *                 type: string
   *               status:
   *                 type: string
   *               messageId:
   *                 type: string
   *             required:
   *               - status
   *     responses:
   *       200:
   *         description: Message status updated
   */
  route.post('/message_status', middlewares.checkToken, celebrate({
    [Segments.BODY]: Joi.object({
      roomId: Joi.string().allow("").allow(null),
      messageId: Joi.string().allow("").allow(null),
      status: Joi.string().required().valid(MessageStatus.DELIVERED, MessageStatus.SEEN, MessageStatus.DELETED)
    })
  }), async (req: Request, res: Response) => {
    const result = await Container.get(ChatService).updateMessageStatus(req, res);
    return res.status(200).json({
      success: result.flag,
      message: result.message,
      // ...(result.flag && { data: result.message })
    });
  });
};
