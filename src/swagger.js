const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Product Catalog Service API',
      version: '1.0.0',
      description:
        'Manages the ShopEase product catalog. Requires a valid JWT from the User Auth Service for write operations. Calls user-service /auth/verify to validate tokens.',
    },
    servers: [{ url: 'http://localhost:3002', description: 'Local development' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    tags: [{ name: 'Products', description: 'Product CRUD operations' }],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = { swaggerSpec: swaggerJsdoc(options) };
