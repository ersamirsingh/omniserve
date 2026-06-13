import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import router from './routes/api.v1.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { rateLimiter } from './middleware/rateLimiter.middleware.js';

const app = express();


app.use(cors({
   credentials: true,
   origin: (origin, callback) => {
      if (!origin) {
         return callback(null, true);
      }

      if (origin === process.env.CLIENT_URL) {
         return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
   }
}));


app.use(express.json());
app.use(cookieParser())


app.get("/", (req, res) => {
   res.json({ connection: "OK" });
})

// Apply global rate limiter to all api routes: 100 requests per 15 minutes
app.use('/api', rateLimiter({
   windowMs: 15 * 60 * 1000,
   max: 100,
   message: 'Too many requests from this IP, please try again after 15 minutes'
}));

app.use('/api', router);

// Global Error Handler
app.use(errorHandler);

export default app;
