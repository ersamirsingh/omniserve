import { ApiError } from './ApiError.js';
import { TABLE_STATE_TRANSITIONS, type TableStatus } from '../constants/table-states.constants.js';

export const assertTableTransition = (from: TableStatus, to: TableStatus): void => {
  const allowed = TABLE_STATE_TRANSITIONS[from] ?? [];

  if (!allowed.includes(to)) {
    throw ApiError.invalidTransition(from, to);
  }
};
