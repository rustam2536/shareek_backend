import express from 'express';
import cors from 'cors';
import { OpticMiddleware } from '@useoptic/express-middleware';
import routes from '@/api';
import config from '@/config';
import { isCelebrateError } from 'celebrate';
import path from 'path';
export default ({ app }: { app: express.Application }) => {
  /**
   * Health Check endpoints
   * @TODO Explain why they are here
   */
  app.get('/status', (req, res) => {
    res.status(200).end();
  });
  app.head('/status', (req, res) => {
    res.status(200).end();
  });

  // Useful if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
  // It shows the real origin IP in the heroku or Cloudwatch logs
  app.enable('trust proxy');

  // The magic package that prevents frontend developers going nuts
  // Alternate description:
  // Enable Cross Origin Resource Sharing to all origins by default
  app.use(cors());

  // Some sauce that always add since 2014
  // "Lets you use HTTP verbs such as PUT or DELETE in places where the client doesn't support it."
  // Maybe not needed anymore ?
  app.use(require('method-override')());

  // Transforms the raw string of req.body into json
  app.use(express.json());

  // Static route to serve uploaded files (optional)
  // app.use('/uploads', express.static('files/uploads'));
  const uploadsPath = path.join(__dirname, '..', '..', 'files', 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  // Load API routes
  app.use(config.api.prefix, routes());

  // API Documentation
  app.use(OpticMiddleware({
    enabled: process.env.NODE_ENV !== 'production',
  }));

  /// catch 404 and forward to error handler
  app.use((req, res, next) => {
    const err = new Error('Not Found');
    err['status'] = 404;
    next(err);
  });

  /// error handlers
  app.use((err, req, res, next) => {
    /**
     * Handle 401 thrown by express-jwt library
     */
    if (err.name === 'UnauthorizedError') {
      return res
        .status(err.status)
        .send({ message: err.message })
        .end();
    }
    return next(err);
  });

  // Celebrate error handler
  app.use((err, req, res, next) => {
    let message = err.message;
    if (isCelebrateError(err)) {
      //console.log(err.details.get('body').message);
      if (err.details.get('body')) {
        message = err.details.get('body').message;
      }
      if (err.details.get('params')) {
        message = err.details.get('params').message;
      }
      if (err.details.get('query')) {
        message = err.details.get('query').message;
      }
    }
    res.status(err.status || 200);
    return res.json({ success: false, message: message });
    // res.json({
    //   errors: {
    //     message: message,
    //   },
    // });
  });

  app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.json({
      errors: {
        message: err.message,
      },
    });
  });
};
