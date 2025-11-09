import { Router, Request, Response } from 'express';
import { celebrate, Joi } from 'celebrate';
import Container from 'typedi';
import UserService from '@/services/userService';
import { IUser, UserRole } from '@/interfaces/IUser';
import middlewares from '../middlewares';
const route = Router();
import multer from 'multer';
import path from 'path';

// Set up multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'files/uploads/'); // Uploads folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // e.g., 1629137912394.jpg
  }
});

// Filter for image types (optional)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed'));
  }
};

const upload = multer({ storage, fileFilter });

export default (app: Router) => {
  app.use('/users', route);

  route.get('/me', (req: Request, res: Response) => {
    return res.json({ user: req.currentUser }).status(200);
  });

  /**
   * @swagger
   * /users/sign_up:
   *   post:
   *     summary: Register a new user
   *     tags:
   *       - Users
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - password
   *               - name
   *               - phone
   *               - countryCode
   *             properties:
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *               name:
   *                 type: string
   *               phone:
   *                 type: string
   *               referral:
   *                 type: string
   *               otp:
   *                 type: string
   *               countryCode:
   *                 type: string
   *               adId:
   *                 type: string
   *               expiryDate:
   *                 type: string
   *               profile:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: User created successfully or error message
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
  route.post('/sign_up', upload.single('profile'), celebrate({
    body: Joi.object({
      email: Joi.string().allow("").allow(null),
      password: Joi.string().required(),
      name: Joi.string().required(),
      phone: Joi.string().required(),
      referral: Joi.string().allow("").allow(null),
      otp: Joi.string().allow("").allow(null),
      countryCode: Joi.string().required(),
      profile: Joi.string().allow("").allow(null),
      adId: Joi.string().allow("").allow(null),
      expiryDate: Joi.string().allow("").allow(null),
    }),
  }), async (req: Request, res: Response) => {
    if (req['file']) {
      req.body.profile = req['file'].filename;
    }
    const result: { message: string | object, flag: boolean } = await Container.get(UserService)
      .createUser(req, res);
    if (result.flag) {
      return res.status(200).json({
        success: true,
        message: typeof result.message === 'string' ? result.message : "Success",
        data: typeof result.message === 'string' ? {} : result.message
      });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /users/login:
   *   post:
   *     summary: Login a user
   *     tags:
   *       - Users
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - phone
   *               - password
   *             properties:
   *               phone:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Login success or failure
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
  route.post('/login', celebrate({
    body: Joi.object({
      phone: Joi.string().required(),
      password: Joi.string().required()
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string | object, flag: boolean } = await Container.get(UserService)
      .loginUser(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /users/change_password:
   *   post:
   *     summary: Change user password
   *     tags:
   *       - Users
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
   *               - oldPassword
   *               - newPassword
   *             properties:
   *               oldPassword:
   *                 type: string
   *               newPassword:
   *                 type: string
   *     responses:
   *       200:
   *         description: Password change result
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
  route.post('/change_password', middlewares.checkToken, celebrate({
    body: Joi.object({
      oldPassword: Joi.string().required(),
      newPassword: Joi.string().required(),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string | object, flag: boolean } = await Container.get(UserService)
      .changePassword(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Password changed successfully" });
    } else {
      return res.status(400).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /users/forgot_password:
   *   post:
   *     summary: forgot password
   *     tags:
   *       - Users
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - phone
   *             properties:
   *               phone:
   *                 type: string
   *               otp:
   *                 type: string
   *                 nullable: true
   *               password:
   *                 type: string
   *                 nullable: true
   *     responses:
   *       200:
   *         description: Password reset instructions sent
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
  route.post('/forgot_password', celebrate({
    body: Joi.object({
      phone: Joi.string().required(),
      otp: Joi.string().allow("").allow(null),
      password: Joi.string().allow("").allow(null),
    }),
  }), async (req: Request, res: Response) => {
    const userService = Container.get(UserService);
    const result: { message: string | object; flag: boolean } = await userService
      .forgotPassword(req, res);
    if (result.flag) {
      return res.status(200).json({
        success: true,
        message: typeof result.message === 'string' ? result.message : "Success",
        data: typeof result.message === 'string' ? {} : result.message
      });
    } else {
      return res.status(400).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /users/logout:
   *   get:
   *     summary: logout user
   *     tags:
   *       - Users
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     responses:
   *       200:
   *         description: Logout success
   */
  route.get('/logout', middlewares.checkToken, async (req: Request, res: Response) => {
    const result: { message: string | object; flag: boolean } = await Container.get(UserService)
      .logoutUser(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: result.message, data: {} });
    } else {
      return res.status(400).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /users/profile:
   *   get:
   *     summary: Get user profile
   *     tags:
   *       - Users
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     responses:
   *       200:
   *         description: Profile data
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
   *                   $ref: object
   */
  route.get('/profile', middlewares.checkToken, async (req: Request, res: Response) => {
    const result: { message: string | IUser, flag: boolean } = await Container.get(UserService)
      .getUserDetails(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /users/update_details:
   *   post:
   *     summary: Update user details
   *     tags:
   *       - Users
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
   *               uniqueId:
   *                 type: string
   *               email:
   *                 type: string
   *               name:
   *                 type: string
   *               adId:
   *                 type: string
   *               expiryDate:
   *                 type: string
   *     responses:
   *       200:
   *         description: User details data
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
   *                   $ref: object
   */
  route.post('/update_details', celebrate({
    body: Joi.object({
      uniqueId: Joi.string().allow("").allow(null),
      email: Joi.string().allow("").allow(null),
      name: Joi.string().allow("").allow(null),
      adId: Joi.string().allow("").allow(null),
      expiryDate: Joi.string().allow("").allow(null),
    }),
  }), middlewares.checkToken, async (req: Request, res: Response) => {
    const result: { message: string | IUser, flag: boolean } = await Container.get(UserService)
      .updateUserDetails(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  route.post('/approveUserAdId', celebrate({
    body: Joi.object({
      uniqueId: Joi.string().required(),
      isVerified: Joi.boolean().required(),
    }),
  }), middlewares.checkToken, middlewares.checkIsAdmin, async (req: Request, res: Response) => {
    const result: { message: string | IUser, flag: boolean } = await Container.get(UserService)
      .updateUserDetails(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /users/update_profile:
   *   post:
   *     summary: Update profile picture
   *     tags:
   *       - Users
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - profile
   *             properties:
   *               uniqueId:
   *                 type: string
   *               profile:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: User profile updated or error message
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
  route.post('/update_profile', upload.single('profile'), celebrate({
    body: Joi.object({
      uniqueId: Joi.string().allow("").allow(null),
      profile: Joi.string().allow("").allow(null),
    }),
  }), async (req: Request, res: Response) => {
    if (req['file']) {
      req.body.profile = req['file'].filename;
    }
    const result: { message: string | object, flag: boolean } = await Container.get(UserService)
      .updateUserDetails(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /users/add_wishlist:
   *   post:
   *     summary: Add property to wishlist
   *     tags:
   *       - Users
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
   *             properties:
   *               propertyId:
   *                 type: string
   *                 example: "property123"
   *     responses:
   *       200:
   *         description: Wishlist update response
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
   */
  route.post('/add_wishlist', celebrate({
    body: Joi.object({
      propertyId: Joi.string().required(),
    }),
  }), middlewares.checkToken, async (req, res) => {
    const result: { message: string, flag: boolean } = await Container.get(UserService)
      .addWishlist(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /users/remove_wishlist:
   *   post:
   *     summary: Remove property from wishlist
   *     tags:
   *       - Users
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
   *             properties:
   *               propertyId:
   *                 type: string
   *                 example: "property123"
   *     responses:
   *       200:
   *         description: Wishlist removal response
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
   */
  route.post('/remove_wishlist', celebrate({
    body: Joi.object({
      propertyId: Joi.string().required(),
    }),
  }), middlewares.checkToken, async (req, res) => {
    const result: { message: string, flag: boolean } = await Container.get(UserService)
      .removeWishlist(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /users/block_user:
   *   post:
   *     summary: Block User
   *     tags:
   *       - Users
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
   *               - userId
   *             properties:
   *               userId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Blocked update response
   */
  route.post('/block_user', celebrate({
    body: Joi.object({
      userId: Joi.string().required(),
    }),
  }), middlewares.checkToken, async (req, res) => {
    const result: { message: string, flag: boolean } = await Container.get(UserService)
      .addBlockedUsers(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  route.post('/admin/block', celebrate({
    body: Joi.object({
      userId: Joi.string().required(),
      block: Joi.boolean().required(),
    }),
  }), middlewares.checkToken, async (req, res) => {
    const result: { message: string, flag: boolean } = await Container.get(UserService)
      .blockUser(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /users/owner_profile:
   *   get:
   *     summary: Get owner profile
   *     tags:
   *       - Users
   *     parameters:
   *       - in: query
   *         name: uniqueId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Owner Profile data
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
  route.get('/owner_profile', celebrate({
    query: Joi.object({
      uniqueId: Joi.string().required(),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string | any, flag: boolean } = await Container.get(UserService)
      .getOwnerDetails(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  route.get('/admin/owner_profile', middlewares.checkToken, middlewares.checkIsAdmin, celebrate({
    query: Joi.object({
      uniqueId: Joi.string().required(),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string | any, flag: boolean } = await Container.get(UserService)
      .getSellerDetails(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  route.get('/admin/all_users', middlewares.checkToken, middlewares.checkIsAdmin, celebrate({
    query: Joi.object({
      page: Joi.string().required(),
      searchTerm: Joi.string().allow("").allow(null),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string | any, flag: boolean } = await Container.get(UserService)
      .getAllUsers(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  route.get('/admin/users_phone', middlewares.checkToken, middlewares.checkIsAdmin, async (req: Request, res: Response) => {
    const result: { message: string | any, flag: boolean } = await Container.get(UserService)
      .getAllUsersPhone(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /users/my_saved_ads:
   *   get:
   *     summary: Get Saved Ads
   *     tags:
   *       - Users
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     responses:
   *       200:
   *         description: Saved Ads
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
  route.get('/my_saved_ads', middlewares.checkToken, async (req: Request, res: Response) => {
    const result: { message: string | any, flag: boolean } = await Container.get(UserService)
      .getMySavedAds(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success.", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /users/clear_saved_ads:
   *   get:
   *     summary: Clear Saved Ads
   *     tags:
   *       - Users
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     responses:
   *       200:
   *         description: Clear Saved Ads
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
  route.get('/clear_saved_ads', middlewares.checkToken, async (req: Request, res: Response) => {
    const result: { message: string | any, flag: boolean } = await Container.get(UserService)
      .clearWishlist(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  // === API ROUTE ===
  route.get("/deeplink", (req, res) => {
    // === CONFIGURATION ===
    const SCHEME = "shareeek://open"; // your app's custom scheme
    const APP_PACKAGE = "com.shareeek.app"; // Android package name
    const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${APP_PACKAGE}`;
    const APP_STORE_URL = "https://apps.apple.com/app/id1234567890"; // iOS App Store URL
    const WEBSITE_URL = "http://13.221.181.88:81/"; // fallback web URL
    // const WEBSITE_URL = "https://shareeek.com"; // fallback web URL
    const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Opening Shareeek...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">

        <script>
          const SCHEME = "${SCHEME}";
          const APP_PACKAGE = "${APP_PACKAGE}";
          const PLAY_STORE_URL = "${PLAY_STORE_URL}";
          const APP_STORE_URL = "${APP_STORE_URL}";
          const WEBSITE_URL = "${WEBSITE_URL}";

          function isAndroid() {
            return /android/i.test(navigator.userAgent);
          }

          function isIOS() {
            return /iphone|ipad|ipod/i.test(navigator.userAgent);
          }

          function getQueryString() {
            const query = window.location.search;
            return query ? query : "";
          }

          function redirectToApp() {
            const query = getQueryString();
            const deepLink = \`\${SCHEME}\${query}\`;

            if (isAndroid()) {
              const intentUrl = \`intent://open\${query}#Intent;scheme=shareeek;package=\${APP_PACKAGE};S.browser_fallback_url=\${encodeURIComponent(PLAY_STORE_URL)};end\`;
              window.location.href = intentUrl;

            } else if (isIOS()) {
              window.location.href = deepLink;
              setTimeout(() => {
                window.location.href = APP_STORE_URL;
              }, 2000);

            } else {
              window.location.href = \`\${WEBSITE_URL}\${query}\`;
            }
          }

          window.onload = redirectToApp;
        </script>
      </head>

      <body>
        <p>Opening Shareeek...<br>
        If nothing happens, <a href="${WEBSITE_URL}${query}">click here</a>.</p>
      </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });
};
