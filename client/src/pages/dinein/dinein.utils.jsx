import Badge from '../../components/ui/Badge';
import { STATUS_VARIANTS, TABLE_STATUS_COLORS } from './dinein.constants';

export const statusBadge = (status) => (
  <Badge variant={STATUS_VARIANTS[status] || 'neutral'}>{String(status || 'UNKNOWN').replaceAll('_', ' ')}</Badge>
);

export const tableStatusStyle = (status) => ({
  borderColor: TABLE_STATUS_COLORS[status] || '#6b7280',
  boxShadow: `inset 0 0 0 1px ${TABLE_STATUS_COLORS[status] || '#6b7280'}20`,
  backgroundColor: `${TABLE_STATUS_COLORS[status] || '#6b7280'}14`,
});

export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString() : '—';

export const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const sortByDateDesc = (items, key = 'createdAt') =>
  [...items].sort((a, b) => new Date(b?.[key] || 0) - new Date(a?.[key] || 0));
