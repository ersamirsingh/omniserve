import neo4j, { Driver, Session } from 'neo4j-driver';
import { COPILOT_CONFIG } from '../config/aiCopilot-env.config.js';

let driverInstance: any = null;

export interface INeo4jWriteQuery {
  query: string;
  params?: Record<string, any>;
}

export class Neo4jService {
  /**
   * Returns the Neo4j driver instance, initializing it if necessary.
   * Falls back to a mock driver if connection details are missing or fail.
   */
  static getDriver(): any {
    if (driverInstance) return driverInstance;

    const { uri, user, password } = COPILOT_CONFIG.neo4j;

    if (!uri || !user || !password) {
      console.warn('[Neo4jService] URI, User, or Password missing. Operating in MOCK mode.');
      driverInstance = this.createMockDriver();
      return driverInstance;
    }

    try {
      driverInstance = neo4j.driver(uri, neo4j.auth.basic(user, password));
    } catch (error: any) {
      console.error('[Neo4jService] Failed to initialize Neo4j driver, falling back to MOCK:', error.message);
      driverInstance = this.createMockDriver();
    }

    return driverInstance;
  }

  /**
   * Creates a mock driver for environment flexibility.
   */
  private static createMockDriver(): any {
    return {
      isMock: true,
      session: () => ({
        run: async (query: string, params?: Record<string, any>) => {
          return {
            records: [],
          };
        },
        close: async () => {},
      }),
      close: async () => {},
    };
  }

  /**
   * Runs a Cypher query inside a Neo4j session.
   */
  static async runQuery(query: string, params: Record<string, any> = {}): Promise<any[]> {
    const driver = this.getDriver();
    const session = driver.session();
    try {
      const result = await session.run(query, params);
      return result.records;
    } catch (error: any) {
      console.error('[Neo4jService] Error executing query:', error.message);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Runs write queries in a transaction block.
   */
  static async runWriteTransaction(queriesWithParams: INeo4jWriteQuery[]): Promise<any[]> {
    const driver = this.getDriver();
    const session = driver.session();
    try {
      const rxResult = await session.executeWrite(async (tx: any) => {
        const results = [];
        for (const item of queriesWithParams) {
          const res = await tx.run(item.query, item.params);
          results.push(res);
        }
        return results;
      });
      return rxResult;
    } catch (error: any) {
      console.error('[Neo4jService] Write transaction failed:', error.message);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Helper to format Neo4j record structures into plain JS objects.
   */
  static formatRecord(record: any): Record<string, any> | null {
    if (!record) return null;
    const obj: Record<string, any> = {};
    record.keys.forEach((key: string) => {
      const val = record.get(key);
      obj[key] = this.toJS(val);
    });
    return obj;
  }

  /**
   * Recursively converts Neo4j Integers and types into JavaScript equivalents.
   */
  static toJS(val: any): any {
    if (val === null || val === undefined) return null;
    if (neo4j.isInt(val)) return val.toNumber();
    if (Array.isArray(val)) return val.map((v) => this.toJS(v));
    if (typeof val === 'object') {
      if (val.properties) {
        return {
          id: val.identity ? this.toJS(val.identity) : null,
          labels: val.labels || [],
          ...this.toJS(val.properties),
        };
      }
      const converted: Record<string, any> = {};
      Object.keys(val).forEach((k) => {
        converted[k] = this.toJS(val[k]);
      });
      return converted;
    }
    return val;
  }
}
