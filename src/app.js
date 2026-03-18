import express from 'express';
import { loadExpress } from './loaders/express.js';
import { loadRoutes } from './loaders/routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import * as ApiResponse from './shared/ApiResponse.js';

const app = express();

loadExpress(app);
loadRoutes(app);

// 404 handler — must be after all routes
app.use((req, res) => {
  ApiResponse.error(res, {
    statusCode: 404,
    code: 'RESOURCE_NOT_FOUND',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Central error handler — must be last
app.use(errorHandler);

export default app;
