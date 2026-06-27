import { EventEmitter } from 'node:events';
import type { DomainEvent } from '../interfaces/domain-event.interface.js';
import { logger } from '../utils/logger.js';

class DineInEventBus extends EventEmitter {
  publish<T>(event: DomainEvent<T>): void {
    logger.info('Publishing dine-in event', {
      event: event.name,
      aggregateId: event.aggregateId,
      tenantId: event.tenantId,
      outletId: event.outletId,
    });

    this.emit(event.name, event);
  }
}

export const eventBus = new DineInEventBus();
