import { checkMongoDB, checkRedis, checkPaymentGateway, checkDiskSpace } from './checks/infra.checks.js';
import { modelCheckers } from './checks/module.checks.js';

export class HealthService {

  private static async withTimeout(
    promise: Promise<any>,
    ms: number,
    checkName: string
  ): Promise<any> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Timeout: Check "${checkName}" exceeded ${ms}ms limit`));
      }, ms);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId!);
      return {
        status: 'down',
        responseTimeMs: ms,
        details: error.message || 'Timeout exceeded',
      };
    }
  }

  static async runChecks(deep = false): Promise<any> {
    const timeoutMs = 3000;

    const infraCheckSpecs = [
      { name: 'mongodb', promise: checkMongoDB(deep) },
      { name: 'redis', promise: checkRedis(deep) },
      { name: 'paymentGateway', promise: checkPaymentGateway() },
      { name: 'diskSpace', promise: checkDiskSpace() },
    ];

    const moduleCheckSpecs = Object.entries(modelCheckers).map(([name, checkFn]) => ({
      name,
      promise: checkFn(deep),
    }));

    const [infraResults, moduleResults] = await Promise.all([
      Promise.all(
        infraCheckSpecs.map(async (spec) => {
          const result = await this.withTimeout(spec.promise, timeoutMs, spec.name);
          return { name: spec.name, result };
        })
      ),
      Promise.all(
        moduleCheckSpecs.map(async (spec) => {
          const result = await this.withTimeout(spec.promise, timeoutMs, spec.name);
          return { name: spec.name, result };
        })
      ),
    ]);

    const infra: Record<string, any> = {};
    let isDegraded = false;
    let isDown = false;

    for (const { name, result } of infraResults) {
      infra[name] = result;
      if (result.status === 'down') {
        isDown = true;
      } else if (result.status === 'degraded') {
        isDegraded = true;
      }
    }

    const modules: Record<string, any> = {};
    for (const { name, result } of moduleResults) {
      modules[name] = result;
      if (result.status === 'down') {
        isDown = true;
      } else if (result.status === 'degraded') {
        isDegraded = true;
      }
    }

    let status = 'ok';
    if (isDown) {
      status = 'down';
    } else if (isDegraded) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        infra,
        modules,
      },
    };
  }
}
