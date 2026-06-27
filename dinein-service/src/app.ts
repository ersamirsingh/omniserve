import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import apiRouter from './routes/api.v1.js';
import { swaggerDocument } from './docs/swagger.js';
import { optionalAuth, requireAuth } from './middlewares/auth.middleware.js';
import { apiRateLimiter } from './middlewares/rate-limiter.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { getEnv } from './config/env.config.js';

const app = express();
const env = getEnv();
const corsOrigins = [env.CLIENT_URL, env.DINEIN_CONSOLE_URL, env.MAIN_CLIENT_URL].filter(
  (origin): origin is string => Boolean(origin)
);

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(optionalAuth);

app.get('/', (_req, res) => {
  res.json({ success: true, message: 'FoodMesh Dine-In Service' });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/v1', apiRateLimiter, requireAuth, apiRouter);
app.use(errorHandler);

export default app;
