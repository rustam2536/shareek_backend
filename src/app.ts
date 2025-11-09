import 'reflect-metadata'; // We need this in order to use @Decorators

import config from './config';

import express from 'express';
import http from 'http';

import Logger from './loaders/logger';
import swaggerSpec from './swagger';
import swaggerUi from 'swagger-ui-express';
import { Container } from 'typedi';
import { WebSocketMessage } from './sockets/webSocketMessage';
import { WebSocketContact } from './sockets/webSocketContact';

async function startServer() {
  const app = express();

  const server = http.createServer(app);

  // Swagger route
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  /**
   * A little hack here
   * Import/Export can only be used in 'top-level code'
   * Well, at least in node 10 without babel and at the time of writing
   * So we are using good old require.
   **/
  await require('./loaders').default({ expressApp: app });

  // Get the WebSocketChat instance from typedi and init with the server
  await Container.get(WebSocketMessage).init(server);

  // Load contact socket
  await Container.get(WebSocketContact).init();

  server.listen(config.port, () => {
    Logger.info(`
      ################################################
      🛡️  Server listening on port: ${config.port} 🛡️
      ################################################
    `);
  }).on('error', err => {
    Logger.error(err);
    process.exit(1);
  });

}

startServer();
