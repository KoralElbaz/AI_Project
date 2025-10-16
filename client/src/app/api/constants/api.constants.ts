// קבועים עבור API

export const API_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  TIMEOUT: 10000, // 10 שניות
  RETRY_ATTEMPTS: 3
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

