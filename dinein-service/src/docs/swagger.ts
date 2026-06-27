export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'FoodMesh Dine-In Service API',
    version: '1.0.0',
    description: 'Independent dine-in operations service for floor, table, session, reservation, ordering, assistance, and billing workflows.',
  },
  servers: [{ url: '/api/v1' }],
  paths: {
    '/health': { get: { summary: 'Health check', responses: { '200': { description: 'OK' } } } },
    '/floor/map': { get: { summary: 'Get live floor map', responses: { '200': { description: 'Floor map' } } } },
    '/tables': {
      get: { summary: 'List tables', responses: { '200': { description: 'Tables' } } },
      post: { summary: 'Create table', responses: { '201': { description: 'Created' } } },
    },
    '/sessions': {
      get: { summary: 'List active sessions', responses: { '200': { description: 'Sessions' } } },
      post: { summary: 'Open session', responses: { '201': { description: 'Created' } } },
    },
    '/reservations': {
      get: { summary: 'List reservations', responses: { '200': { description: 'Reservations' } } },
      post: { summary: 'Create reservation', responses: { '201': { description: 'Created' } } },
    },
    '/orders': {
      get: { summary: 'List orders', responses: { '200': { description: 'Orders' } } },
      post: { summary: 'Create order', responses: { '201': { description: 'Created' } } },
    },
    '/assistance': {
      get: { summary: 'List assistance requests', responses: { '200': { description: 'Requests' } } },
      post: { summary: 'Create assistance request', responses: { '201': { description: 'Created' } } },
    },
    '/billing/generate': {
      post: { summary: 'Generate bill', responses: { '201': { description: 'Created' } } },
    },
  },
} as const;
