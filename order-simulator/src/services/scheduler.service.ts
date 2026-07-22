import axios, { AxiosResponse } from 'axios';
import { generateOrderPayload } from '../templates/order-templates.js';

export interface ScheduleTaskParams {
  tenantId: string;
  provider: 'MOCK_SWIGGY' | 'MOCK_ZOMATO' | 'MIXED';
  orderCount: number;
  delaySeconds: number;
  apiUrl?: string;
  outletId?: string;
}

export interface TaskResultItem {
  orderId: string;
  provider: string;
  status: 'SUCCESS' | 'FAILED';
  statusCode?: number;
  error?: string;
  response?: any;
}

export interface ScheduledTask {
  id: string;
  tenantId: string;
  provider: 'MOCK_SWIGGY' | 'MOCK_ZOMATO' | 'MIXED';
  orderCount: number;
  delaySeconds: number;
  scheduledAt: string;
  triggerAt: string;
  remainingSeconds: number;
  status: 'PENDING' | 'DISPATCHING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  dispatchedCount: number;
  results: TaskResultItem[];
  timerId?: NodeJS.Timeout;
}

class SchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private history: ScheduledTask[] = [];
  private defaultApiUrl: string = process.env.OMNISERVE_API_URL || 'http://localhost:5000/api/v1';

  constructor() {
    setInterval(() => {
      const now = Date.now();
      this.tasks.forEach((task) => {
        if (task.status === 'PENDING') {
          const diff = Math.max(0, Math.ceil((new Date(task.triggerAt).getTime() - now) / 1000));
          task.remainingSeconds = diff;
        }
      });
    }, 500);
  }

  public scheduleTask(params: ScheduleTaskParams): ScheduledTask {
    const taskId = `sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = new Date();
    const triggerDate = new Date(now.getTime() + params.delaySeconds * 1000);

    const task: ScheduledTask = {
      id: taskId,
      tenantId: params.tenantId,
      provider: params.provider,
      orderCount: params.orderCount || 1,
      delaySeconds: params.delaySeconds,
      scheduledAt: now.toISOString(),
      triggerAt: triggerDate.toISOString(),
      remainingSeconds: params.delaySeconds,
      status: 'PENDING',
      dispatchedCount: 0,
      results: []
    };

    const delayMs = params.delaySeconds * 1000;
    task.timerId = setTimeout(() => {
      this.executeTask(taskId, params.apiUrl || this.defaultApiUrl, params.outletId);
    }, delayMs);

    this.tasks.set(taskId, task);
    return this.serializeTask(task);
  }

  private async executeTask(taskId: string, apiUrl: string, outletId?: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'PENDING') return;

    task.status = 'DISPATCHING';
    task.remainingSeconds = 0;

    const dispatchPromises: Promise<TaskResultItem>[] = [];

    for (let i = 0; i < task.orderCount; i++) {
      let chosenProvider: 'MOCK_SWIGGY' | 'MOCK_ZOMATO' = 'MOCK_SWIGGY';
      if (task.provider === 'MIXED') {
        chosenProvider = Math.random() > 0.5 ? 'MOCK_SWIGGY' : 'MOCK_ZOMATO';
      } else {
        chosenProvider = task.provider;
      }

      const { endpoint, payload } = generateOrderPayload({
        provider: chosenProvider,
        outletId
      });

      const orderId = payload.order_id || payload.orderId || `ORDER_${i + 1}`;
      const targetUrl = `${apiUrl.replace(/\/$/, '')}${endpoint}?tenantId=${task.tenantId}`;

      const promise = axios
        .post(targetUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': task.tenantId
          },
          timeout: 10000
        })
        .then((res: AxiosResponse) => {
          const isSuccess = res.data && res.data.success !== false;
          if (isSuccess) {
            task.dispatchedCount += 1;
            return {
              orderId,
              provider: chosenProvider,
              status: 'SUCCESS' as const,
              statusCode: res.status,
              response: res.data
            };
          } else {
            return {
              orderId,
              provider: chosenProvider,
              status: 'FAILED' as const,
              statusCode: res.status,
              error: res.data?.message || res.data?.reason || 'Dispatch processing returned failure',
              response: res.data
            };
          }
        })
        .catch((err: any) => {
          const errorMsg =
            err.response?.data?.message ||
            err.response?.data?.error ||
            err.response?.data?.reason ||
            err.message ||
            'Dispatch failed';
          return {
            orderId,
            provider: chosenProvider,
            status: 'FAILED' as const,
            statusCode: err.response?.status || 500,
            error: errorMsg
          };
        });

      dispatchPromises.push(promise);
    }

    const results = await Promise.all(dispatchPromises);
    task.results = results;

    const successCount = results.filter((r) => r.status === 'SUCCESS').length;
    if (successCount === task.orderCount) {
      task.status = 'COMPLETED';
    } else if (successCount > 0) {
      task.status = 'COMPLETED';
    } else {
      task.status = 'FAILED';
    }

    this.history.unshift(this.serializeTask(task));
    if (this.history.length > 50) {
      this.history.pop();
    }
  }

  public cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'PENDING') return false;

    if (task.timerId) {
      clearTimeout(task.timerId);
    }
    task.status = 'CANCELLED';
    task.remainingSeconds = 0;
    this.history.unshift(this.serializeTask(task));
    this.tasks.delete(taskId);
    return true;
  }

  public getActiveTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.status === 'PENDING' || t.status === 'DISPATCHING')
      .map((t) => this.serializeTask(t));
  }

  public getHistory(): ScheduledTask[] {
    return this.history;
  }

  private serializeTask(task: ScheduledTask): ScheduledTask {
    const { timerId, ...rest } = task;
    return rest as ScheduledTask;
  }
}

export const schedulerService = new SchedulerService();
