import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { schedulerService } from './services/scheduler.service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;
const defaultApiUrl = process.env.OMNISERVE_API_URL || 'http://localhost:5000/api/v1';

app.use(cors());
app.use(express.json());

// Serve static frontend UI
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// API Routes
app.get('/api/simulator/health', (req: Request, res: Response) => {
  res.json({
    status: 'UP',
    service: 'OmniServe Order Simulator',
    apiUrl: process.env.OMNISERVE_API_URL || defaultApiUrl,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/simulator/schedule', (req: Request, res: Response) => {
  const { tenantId, provider, orderCount, delaySeconds, apiUrl, outletId } = req.body;

  if (!tenantId) {
    res.status(400).json({ success: false, message: 'tenantId is required' });
    return;
  }

  const delay = Number(delaySeconds) || 0;
  const count = Math.max(1, Number(orderCount) || 1);

  const task = schedulerService.scheduleTask({
    tenantId,
    provider: provider || 'MOCK_SWIGGY',
    orderCount: count,
    delaySeconds: delay,
    apiUrl: apiUrl || defaultApiUrl,
    outletId
  });

  res.status(201).json({
    success: true,
    message: `Scheduled ${count} order(s) to be thrown in ${delay} seconds`,
    task
  });
});

app.get('/api/simulator/tasks', (req: Request, res: Response) => {
  const active = schedulerService.getActiveTasks();
  const history = schedulerService.getHistory();
  res.json({
    success: true,
    active,
    history
  });
});

app.delete('/api/simulator/tasks/:id', (req: Request, res: Response) => {
  const taskId = req.params.id;
  const cancelled = schedulerService.cancelTask(taskId);
  if (cancelled) {
    res.json({ success: true, message: `Task ${taskId} cancelled successfully` });
  } else {
    res.status(404).json({ success: false, message: `Task ${taskId} not found or already completed` });
  }
});

// Fallback to index.html
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 OmniServe Order Simulator running on port ${PORT}`);
  console.log(`👉 Web Dashboard: http://localhost:${PORT}`);
  console.log(`🎯 Target OmniServe API: ${defaultApiUrl}`);
  console.log(`====================================================`);
});
