import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Shareek API',
            version: '1.0.0',
            // description: 'A simple API for managing users',
        },
        servers: [
            {
                url: 'http://13.221.181.88:5001/api',
            },
            {
                url: 'http://localhost:5001/api',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
                sessionId: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'sessionid',
                },
            }
        },
        // security: [
        //     {
        //         bearerAuth: [],
        //     }
        // ],
    },

    // apis: ['./api/routes/*.ts'], // Path to the API docs
    apis: [path.resolve(__dirname, './api/routes/*.ts')],
};

const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;
