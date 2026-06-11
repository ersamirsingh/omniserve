import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import router from './routes/api.v1.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';

const app = express();

app.use(express.json());
app.use(cookieParser())

app.use(cors({
   // origin: 'http://localhost:5174',
   origin: '*',
   credentials: true
}))

app.get("/", (req, res) => {
   res.json({connection: "OK"});
})

app.use('/api', router);

// Global Error Handler
app.use(errorHandler);

export default app;
