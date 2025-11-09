import { Router, Request, Response } from 'express';
import { celebrate, Joi } from 'celebrate';
import Container from 'typedi';
import middlewares from '../middlewares';
import PropertyService from '@/services/propertyService';
import { Furnishing, ListedBy, ProjectStatus, PropertyInputDTO, PropertyPurpose, PropertyStatus, PropertyStruct, SortBy, StreetDirection } from '@/interfaces/property';
const route = Router();
import multer from 'multer';
import path from 'path';
import { CitiesStruct } from '@/interfaces/cities';

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

const videoFileFilter = (req, file, cb) => {
  const allowedTypes = /mp4|mov|avi|mkv/; // Add types as needed
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed'));
  }
};

const upload = multer({ storage, fileFilter });
const uploadVideos = multer({
  storage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 50 MB in bytes
  }
});

export default (app: Router) => {
  app.use('/property', route);

  /**
   * @swagger
   * /property/create:
   *   post:
   *     summary: Create a new property listing
   *     tags:
   *       - Property
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
   *               - description
   *               - price
   *               - for
   *               - categoryId
   *               - location
   *               - features
   *             properties:
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               price:
   *                 type: string
   *               for:
   *                 type: string
   *               projectName:
   *                 type: string
   *               categoryId:
   *                 type: string
   *               listedBy:
   *                 type: string
   *               furnishing:
   *                 type: string
   *               streetDirection:
   *                 type: string
   *               propertyArea:
   *                 type: string
   *               propertyWidth:
   *                 type: string
   *               propertyDepth:
   *                 type: string
   *               streetWidth:
   *                 type: string
   *               projectStatus:
   *                 type: string
   *               location:
   *                 type: object
   *                 properties:
   *                   address:
   *                     type: string
   *                   city:
   *                     type: string
   *                   state:
   *                     type: string
   *                   country:
   *                     type: string
   *                   longitude:
   *                     type: number
   *                   latitude:
   *                     type: number
   *               features:
   *                 type: object
   *                 properties:
   *                   floorNo:
   *                     type: number
   *                   bedRooms:
   *                     type: number
   *                   livingRooms:
   *                     type: number
   *                   bathRooms:
   *                     type: number
   *                   kitchen:
   *                     type: boolean
   *                   driverRoom:
   *                     type: boolean
   *                   maidRoom:
   *                     type: boolean
   *                   pool:
   *                     type: boolean
   *                   basement:
   *                     type: boolean
   *                   totalFloors:
   *                     type: number
   *                   carParking:
   *                     type: number
   *                   internalStair:
   *                     type: boolean
   *                   lift:
   *                     type: boolean
   *                   drainageAvailability:
   *                     type: boolean
   *                   waterAvailability:
   *                     type: boolean
   *                   electricalAvailability:
   *                     type: boolean
   *                   network4g:
   *                     type: boolean
   *                   network5g:
   *                     type: boolean
   *               expiresAt:
   *                 type: string
   *                 format: date
   *     responses:
   *       200:
   *         description: Property created
   */
  route.post('/create', middlewares.checkToken, celebrate({
    body: Joi.object({
      title: Joi.string().required(),
      description: Joi.string().required(),
      price: Joi.string().required(),
      for: Joi.string().valid(...Object.values(PropertyPurpose)).required(),
      projectName: Joi.string().optional().allow("").allow(null),
      categoryId: Joi.string().required(),
      listedBy: Joi.string().optional().allow("").allow(null).valid(...Object.values(ListedBy)),
      furnishing: Joi.string().optional().allow("").allow(null).valid(...Object.values(Furnishing)),
      streetDirection: Joi.string().optional().allow("").allow(null).valid(...Object.values(StreetDirection)),
      propertyArea: Joi.string().optional().allow("").allow(null),
      propertyWidth: Joi.string().optional().allow("").allow(null),
      propertyDepth: Joi.string().optional().allow("").allow(null),
      streetWidth: Joi.string().optional().allow("").allow(null),
      projectStatus: Joi.string().optional().allow("").allow(null).valid(...Object.values(ProjectStatus)),

      location: Joi.object({
        address: Joi.string().allow("").allow(null),
        city: Joi.string().allow("").allow(null),
        state: Joi.string().allow("").allow(null),
        iso2Code: Joi.string().allow("").allow(null),
        country: Joi.string().required(),
        longitude: Joi.number().required(),
        latitude: Joi.number().required(),
      }).required(),

      features: Joi.object({
        floorNo: Joi.number().optional().allow("").allow(null),
        bedRooms: Joi.number().required(),
        livingRooms: Joi.number().required(),
        bathRooms: Joi.number().required(),
        kitchen: Joi.boolean().required(),
        driverRoom: Joi.boolean().required(),
        maidRoom: Joi.boolean().required(),
        pool: Joi.boolean().required(),
        basement: Joi.boolean().required(),
        totalFloors: Joi.number().required(),
        carParking: Joi.number().required(),
        internalStair: Joi.boolean().required(),
        lift: Joi.boolean().required(),
        drainageAvailability: Joi.boolean().required(),
        waterAvailability: Joi.boolean().required(),
        electricalAvailability: Joi.boolean().required(),
        network4g: Joi.boolean().required(),
        network5g: Joi.boolean().required(),
      }).required(),

      expiresAt: Joi.date().optional().allow("").allow(null)
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string | PropertyStruct, flag: boolean } = await Container.get(PropertyService)
      .createProperty(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /property/update:
   *   post:
   *     summary: Update property
   *     tags:
   *       - Property
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
   *               - title
   *               - description
   *               - price
   *               - for
   *               - categoryId
   *               - location
   *               - features
   *             properties:
   *               uniqueId:
   *                 type: string
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               price:
   *                 type: string
   *               for:
   *                 type: string
   *               projectName:
   *                 type: string
   *               categoryId:
   *                 type: string
   *               listedBy:
   *                 type: string
   *               furnishing:
   *                 type: string
   *               streetDirection:
   *                 type: string
   *               propertyArea:
   *                 type: string
   *               propertyWidth:
   *                 type: string
   *               propertyDepth:
   *                 type: string
   *               streetWidth:
   *                 type: string
   *               projectStatus:
   *                 type: string
   *               location:
   *                 type: object
   *                 properties:
   *                   address:
   *                     type: string
   *                   city:
   *                     type: string
   *                   state:
   *                     type: string
   *                   country:
   *                     type: string
   *                   longitude:
   *                     type: number
   *                   latitude:
   *                     type: number
   *               features:
   *                 type: object
   *                 properties:
   *                   floorNo:
   *                     type: number
   *                   bedRooms:
   *                     type: number
   *                   livingRooms:
   *                     type: number
   *                   bathRooms:
   *                     type: number
   *                   kitchen:
   *                     type: boolean
   *                   driverRoom:
   *                     type: boolean
   *                   maidRoom:
   *                     type: boolean
   *                   pool:
   *                     type: boolean
   *                   basement:
   *                     type: boolean
   *                   totalFloors:
   *                     type: number
   *                   carParking:
   *                     type: number
   *                   internalStair:
   *                     type: boolean
   *                   lift:
   *                     type: boolean
   *                   drainageAvailability:
   *                     type: boolean
   *                   waterAvailability:
   *                     type: boolean
   *                   electricalAvailability:
   *                     type: boolean
   *                   network4g:
   *                     type: boolean
   *                   network5g:
   *                     type: boolean
   *               expiresAt:
   *                 type: string
   *                 format: date
   *     responses:
   *       200:
   *         description: Property created
   */
  route.post('/update', middlewares.checkToken, celebrate({
    body: Joi.object({
      uniqueId: Joi.string().required(),
      title: Joi.string().required(),
      description: Joi.string().required(),
      price: Joi.string().required(),
      for: Joi.string().valid(...Object.values(PropertyPurpose)).required(),
      projectName: Joi.string().optional().allow("").allow(null),
      categoryId: Joi.string().required(),
      listedBy: Joi.string().optional().allow("").allow(null).valid(...Object.values(ListedBy)),
      furnishing: Joi.string().optional().allow("").allow(null).valid(...Object.values(Furnishing)),
      streetDirection: Joi.string().optional().allow("").allow(null).valid(...Object.values(StreetDirection)),
      propertyArea: Joi.string().optional().allow("").allow(null),
      propertyWidth: Joi.string().optional().allow("").allow(null),
      propertyDepth: Joi.string().optional().allow("").allow(null),
      streetWidth: Joi.string().optional().allow("").allow(null),
      projectStatus: Joi.string().optional().allow("").allow(null).valid(...Object.values(ProjectStatus)),

      location: Joi.object({
        address: Joi.string().allow("").allow(null),
        city: Joi.string().allow("").allow(null),
        state: Joi.string().allow("").allow(null),
        iso2Code: Joi.string().allow("").allow(null),
        country: Joi.string().required(),
        longitude: Joi.number().required(),
        latitude: Joi.number().required(),
      }).required(),

      features: Joi.object({
        floorNo: Joi.number().optional().allow("").allow(null),
        bedRooms: Joi.number().required(),
        livingRooms: Joi.number().required(),
        bathRooms: Joi.number().required(),
        kitchen: Joi.boolean().required(),
        driverRoom: Joi.boolean().required(),
        maidRoom: Joi.boolean().required(),
        pool: Joi.boolean().required(),
        basement: Joi.boolean().required(),
        totalFloors: Joi.number().required(),
        carParking: Joi.number().required(),
        internalStair: Joi.boolean().required(),
        lift: Joi.boolean().required(),
        drainageAvailability: Joi.boolean().required(),
        waterAvailability: Joi.boolean().required(),
        electricalAvailability: Joi.boolean().required(),
        network4g: Joi.boolean().required(),
        network5g: Joi.boolean().required(),
      }).required(),

      expiresAt: Joi.date().optional().allow("").allow(null)
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string | PropertyStruct, flag: boolean } = await Container.get(PropertyService)
      .updateProperty(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /property/upload_files:
   *   post:
   *     summary: Upload images
   *     tags:
   *       - Property
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
   *               - images
   *             properties:
   *               uniqueId:
   *                 type: string
   *               images:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *     responses:
   *       200:
   *         description: Property updated
   */
  route.post('/upload_files', middlewares.checkToken, upload.array('images', 15), celebrate({
    body: Joi.object({
      uniqueId: Joi.string().required(),
      images: Joi.any(),
    }),
  }), async (req: Request, res: Response) => {
    // if (!req['files'] || req['files'].length === 0) {
    //   return res.status(200).send({message: 'No files uploaded', flag: false});
    // }
    req.body.images = req['files']?.map(file => file.filename) || [];
    const result: { message: string | PropertyStruct, flag: boolean } = await Container.get(PropertyService)
      .uploadImgProperty(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /property/delete_image:
   *   post:
   *     summary: Delete image
   *     tags:
   *       - Property
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
   *             properties:
   *               uniqueId:
   *                 type: string
   *               image:
   *                 type: string
   *     responses:
   *       200:
   *         description: Property updated
   */
  route.post('/delete_image', middlewares.checkToken, celebrate({
    body: Joi.object({
      uniqueId: Joi.string().required(),
      image: Joi.string().allow("").allow(null),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string, flag: boolean } = await Container.get(PropertyService)
      .deleteImages(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /property/delete_video:
   *   post:
   *     summary: Delete video
   *     tags:
   *       - Property
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
   *             properties:
   *               uniqueId:
   *                 type: string
   *               fileName:
   *                 type: string
   *     responses:
   *       200:
   *         description: Property updated
   */
  route.post('/delete_video', middlewares.checkToken, celebrate({
    body: Joi.object({
      uniqueId: Joi.string().required(),
      fileName: Joi.string().required(),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string, flag: boolean } = await Container.get(PropertyService)
      .deleteVideos(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /property/upload_videos:
   *   post:
   *     summary: Upload videos
   *     tags:
   *       - Property
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
   *               - videos
   *               - uniqueId
   *             properties:
   *               uniqueId:
   *                 type: string
   *               videos:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *     responses:
   *       200:
   *         description: Property updated
   */
  route.post('/upload_videos', middlewares.checkToken,
    uploadVideos.array('videos', 15), // Use video-specific upload
    celebrate({
      body: Joi.object({
        uniqueId: Joi.string().required(),
        videos: Joi.any(),
      }),
    }), async (req: Request, res: Response) => {
      req.body.videos = req['files']?.map(file => file.filename) || [];
      const result: { message: string | PropertyStruct, flag: boolean } = await Container.get(PropertyService)
        .uploadVideoProperty(req, res);
      if (result.flag) {
        return res.status(200).json({ success: true, message: "Success", data: result.message });
      } else {
        return res.status(200).json({ success: false, message: result.message });
      }
    });

  /**
   * @swagger
   * /property/get_list:
   *   get:
   *     summary: Get list of available properties for public view
   *     tags:
   *       - Property
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     parameters:
   *       - in: query
   *         name: page
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: for
   *         schema:
   *           type: string
   *       - in: query
   *         name: searchTerm
   *         schema:
   *           type: string
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *       - in: query
   *         name: categoryId
   *         schema:
   *           type: string
   *       - in: query
   *         name: minPrice
   *         schema:
   *           type: number
   *       - in: query
   *         name: maxPrice
   *         schema:
   *           type: number
   *       - in: query
   *         name: bedRooms
   *         schema:
   *           type: number
   *       - in: query
   *         name: kitchen
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: latitude
   *         schema:
   *           type: number
   *       - in: query
   *         name: longitude
   *         schema:
   *           type: number
   *       - in: query
   *         name: livingRooms
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: maidRoom
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: pool
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: basement
   *         schema:
   *           type: boolean
   *       # ... add the rest as needed
   *     responses:
   *       200:
   *         description: List of properties
   */
  route.get('/get_list', middlewares.bindUser, celebrate({
    query: Joi.object({
      page: Joi.string().required(),
      searchTerm: Joi.string().allow("").allow(null),
      sortBy: Joi.string().allow("").allow(null).valid(...Object.values(SortBy)),
      categoryId: Joi.string().allow("").allow(null),
      minPrice: Joi.number().allow("").allow(null),
      maxPrice: Joi.number().allow("").allow(null),
      bedRooms: Joi.number().allow("").allow(null),
      for: Joi.string().allow("").allow(null).valid(...Object.values(PropertyPurpose)),
      livingRooms: Joi.number().allow("").allow(null),
      bathRooms: Joi.number().allow("").allow(null),
      kitchen: Joi.boolean().allow("").allow(null),
      driverRoom: Joi.boolean().allow("").allow(null),
      maidRoom: Joi.boolean().allow("").allow(null),
      pool: Joi.boolean().allow("").allow(null),
      basement: Joi.boolean().allow("").allow(null),
      latitude: Joi.number().allow("").allow(null),
      longitude: Joi.number().allow("").allow(null),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string | PropertyInputDTO, flag: boolean } = await Container.get(PropertyService)
      .getPropertyList(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /property/map_data:
   *   get:
   *     summary: Map data view
   *     tags:
   *       - Property
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     parameters:
   *       - in: query
   *         name: for
   *         schema:
   *           type: string
   *       - in: query
   *         name: searchTerm
   *         schema:
   *           type: string
   *       - in: query
   *         name: categoryId
   *         schema:
   *           type: string
   *       - in: query
   *         name: minPrice
   *         schema:
   *           type: number
   *       - in: query
   *         name: maxPrice
   *         schema:
   *           type: number
   *       - in: query
   *         name: bedRooms
   *         schema:
   *           type: number
   *       - in: query
   *         name: kitchen
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: livingRooms
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: maidRoom
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: pool
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: basement
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: longitudeTop
   *         required: true
   *         schema:
   *           type: number
   *       - in: query
   *         name: latitudeTop
   *         required: true
   *         schema:
   *           type: number
   *       - in: query
   *         name: longitudeBottom
   *         required: true
   *         schema:
   *           type: number
   *       - in: query
   *         name: latitudeBottom
   *         required: true
   *         schema:
   *           type: number
   *       # ... add the rest as needed
   *     responses:
   *       200:
   *         description: List of properties
   */
  route.get('/map_data', middlewares.bindUser, celebrate({
    query: Joi.object({
      // page: Joi.string().required(),
      searchTerm: Joi.string().allow("").allow(null),
      // sortBy: Joi.string().allow("").allow(null).valid(...Object.values(SortBy)),
      categoryId: Joi.string().allow("").allow(null),
      minPrice: Joi.number().allow("").allow(null),
      maxPrice: Joi.number().allow("").allow(null),
      bedRooms: Joi.number().allow("").allow(null),
      for: Joi.string().allow("").allow(null).valid(...Object.values(PropertyPurpose)),
      livingRooms: Joi.number().allow("").allow(null),
      bathRooms: Joi.number().allow("").allow(null),
      kitchen: Joi.boolean().allow("").allow(null),
      driverRoom: Joi.boolean().allow("").allow(null),
      maidRoom: Joi.boolean().allow("").allow(null),
      pool: Joi.boolean().allow("").allow(null),
      basement: Joi.boolean().allow("").allow(null),
      latitudeBottom: Joi.number().required(),
      longitudeBottom: Joi.number().required(),
      longitudeTop: Joi.number().required(),
      latitudeTop: Joi.number().required(),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string | PropertyInputDTO, flag: boolean } = await Container.get(PropertyService)
      .getMapList(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /property/home_list:
   *   get:
   *     summary: Get list of available properties for public view
   *     tags:
   *       - Property
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     parameters:
   *       - in: query
   *         name: page
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: searchTerm
   *         schema:
   *           type: string
   *       - in: query
   *         name: latitude
   *         schema:
   *           type: number
   *       - in: query
   *         name: longitude
   *         schema:
   *           type: number
   *       # ... add the rest as needed
   *     responses:
   *       200:
   *         description: List of properties
   */
  route.get('/home_list', middlewares.bindUser, celebrate({
    query: Joi.object({
      page: Joi.string().required(),
      searchTerm: Joi.string().allow("").allow(null),
      latitude: Joi.number().allow("").allow(null),
      longitude: Joi.number().allow("").allow(null),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string | PropertyInputDTO, flag: boolean } = await Container.get(PropertyService)
      .homePageList(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /property/admin/get_list:
   *   get:
   *     summary: Admin - Get list of all properties
   *     tags:
   *       - Property (Admin)
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     parameters:
   *       - in: query
   *         name: page
   *         required: true
   *         schema:
   *           type: string
   *       # Same query params as /get_list
   *     responses:
   *       200:
   *         description: Admin view of property list
   */
  route.get('/admin/get_list', middlewares.checkToken, middlewares.checkIsAdmin, celebrate({
    query: Joi.object({
      page: Joi.string().required(),
      searchTerm: Joi.string().allow("").allow(null),
      status: Joi.string().allow("").allow(null).valid(...Object.values(PropertyStatus)),
      sortBy: Joi.string().allow("").allow(null).valid(...Object.values(SortBy)),
      for: Joi.string().allow("").allow(null).valid(...Object.values(PropertyPurpose)),
      categoryId: Joi.string().allow("").allow(null),
      minPrice: Joi.number().allow("").allow(null),
      maxPrice: Joi.number().allow("").allow(null),
      bedRooms: Joi.number().allow("").allow(null),
      livingRooms: Joi.number().allow("").allow(null),
      bathRooms: Joi.number().allow("").allow(null),
      kitchen: Joi.boolean().allow("").allow(null),
      driverRoom: Joi.boolean().allow("").allow(null),
      maidRoom: Joi.boolean().allow("").allow(null),
      pool: Joi.boolean().allow("").allow(null),
      basement: Joi.boolean().allow("").allow(null),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string | PropertyInputDTO, flag: boolean } = await Container.get(PropertyService)
      .getPropertyList(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /property/property_details:
   *   get:
   *     summary: Get details of a single property
   *     tags:
   *       - Property
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     parameters:
   *       - in: query
   *         name: uniqueId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Property details
   */
  route.get('/property_details', middlewares.bindUser, celebrate({
    query: Joi.object({
      uniqueId: Joi.string().required(),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string | PropertyStruct, flag: boolean } = await Container.get(PropertyService)
      .getPropertyDetails(req, res, { uniqueId: req.query.uniqueId.toString() });
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /property/admin/dashboard:
   *   get:
   *     summary: Admin dashboard
   *     tags:
   *       - Property
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     responses:
   *       200:
   *         description: Property details
   */
  route.get('/admin/dashboard', middlewares.checkToken, middlewares.checkIsAdmin,
    async (req: Request, res: Response) => {
      const result: { message: string | any, flag: boolean } = await Container.get(PropertyService)
        .getDashboard();
      if (result.flag) {
        return res.status(200).json({ success: true, message: "Success", data: result.message });
      } else {
        return res.status(200).json({ success: false, message: result.message });
      }
    });

  /**
   * @swagger
   * /property/admin/update_status:
   *   patch:
   *     summary: Admin - Update status of a property
   *     tags:
   *       - Property (Admin)
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
   *               - status
   *             properties:
   *               uniqueId:
   *                 type: string
   *               status:
   *                 type: string
   *     responses:
   *       200:
   *         description: Property status updated
   */
  route.patch('/admin/update_status', middlewares.checkToken, middlewares.checkIsAdmin, celebrate({
    body: Joi.object({
      uniqueId: Joi.string().required(),
      status: Joi.string().required().valid(...Object.values(PropertyStatus)),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string | PropertyStruct, flag: boolean } = await Container.get(PropertyService)
      .adminUpdateStatus(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /property/update_status:
   *   patch:
   *     summary: Update status of a property
   *     tags:
   *       - Property
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
   *               - status
   *             properties:
   *               uniqueId:
   *                 type: string
   *               status:
   *                 type: string
   *     responses:
   *       200:
   *         description: Property status updated
   */
  route.patch('/update_status', middlewares.checkToken, celebrate({
    body: Joi.object({
      uniqueId: Joi.string().required(),
      status: Joi.string().required().valid(PropertyStatus.SOLD, PropertyStatus.RE_PUBLISH, PropertyStatus.UN_PUBLISH),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string | PropertyStruct, flag: boolean } = await Container.get(PropertyService)
      .updateStatus(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /property/delete_property:
   *   delete:
   *     summary: Delete a property
   *     tags:
   *       - Property
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     parameters:
   *       - in: query
   *         name: uniqueId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Property deleted
   */
  route.delete('/delete_property', middlewares.checkToken, celebrate({
    query: Joi.object({
      uniqueId: Joi.string().required(),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string, flag: boolean } = await Container.get(PropertyService)
      .deleteProperty(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /property/admin/update_fields:
   *   patch:
   *     summary: Admin - Update fields of a property
   *     tags:
   *       - Property (Admin)
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
   *             properties:
   *               uniqueId:
   *                 type: string
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               titleArabic:
   *                 type: string
   *               descriptionArabic:
   *                 type: string
   *     responses:
   *       200:
   *         description: Property status updated
   */
  route.patch('/admin/update_fields', middlewares.checkToken, middlewares.checkIsAdmin, celebrate({
    body: Joi.object({
      uniqueId: Joi.string().required(),
      title: Joi.string().allow("").allow(null),
      description: Joi.string().allow("").allow(null),
      titleArabic: Joi.string().allow("").allow(null),
      descriptionArabic: Joi.string().allow("").allow(null),
      isFeatured: Joi.boolean().allow("").allow(null),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string | PropertyStruct, flag: boolean } = await Container.get(PropertyService)
      .updateFields(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /property/get_list_for_self:
   *   get:
   *     summary: Get properties listed by the current user
   *     tags:
   *       - Property (User)
   *     security:
   *       - bearerAuth: []
   *       - sessionId: []
   *     parameters:
   *       - in: query
   *         name: page
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: searchTerm
   *         schema:
   *           type: string
   *       - in: query
   *         name: fromDate
   *         schema:
   *           type: string
   *           example: 2023-01-01
   *       - in: query
   *         name: toDate
   *         schema:
   *           type: string
   *           example: 2027-12-31
   *     responses:
   *       200:
   *         description: User’s own property listings
   */
  route.get('/get_list_for_self', middlewares.checkToken, celebrate({
    query: Joi.object({
      page: Joi.string().required(),
      searchTerm: Joi.string().allow("").allow(null),
      fromDate: Joi.string().allow(null).allow(""),
      toDate: Joi.string().allow(null).allow(""),
    }),
  }), async (req: Request, res: Response) => {
    req['forSelf'] = true;
    const result: { message: string | PropertyInputDTO, flag: boolean } = await Container.get(PropertyService)
      .getPropertyList(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  /**
   * @swagger
   * /property/search_city:
   *   get:
   *     summary: Search city
   *     tags:
   *       - Property
   *     parameters:
   *       - in: query
   *         name: searchTerm
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User’s own property listings
   */
  route.get('/search_city', celebrate({
    query: Joi.object({
      searchTerm: Joi.string().allow("").allow(null),
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string | CitiesStruct[], flag: boolean } = await Container.get(PropertyService)
      .searchCity(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  route.post('/showInReels', middlewares.checkToken, middlewares.checkIsAdmin, celebrate({
    body: Joi.object({
      uniqueId: Joi.string().required(),
      video: Joi.string().required(),
      status: Joi.boolean().required()
    }),
  }), async (req: Request, res: Response) => {
    const result: { message: string, flag: boolean } = await Container.get(PropertyService)
      .showInReels(req, res);
    if (result.flag) {
      return res.status(200).json({ success: true, message: "Success", data: result.message });
    } else {
      return res.status(200).json({ success: false, message: result.message });
    }
  });

  // route.get('/city', async (req: Request, res: Response) => {
  //   const result: { message: string | any, flag: boolean } = await Container.get(PropertyService)
  //     .ciy(req, res);
  //   if (result.flag) {
  //     return res.status(200).json({ success: true, message: "Success", data: result.message });
  //   } else {
  //     return res.status(200).json({ success: false, message: result.message });
  //   }
  // });
};
