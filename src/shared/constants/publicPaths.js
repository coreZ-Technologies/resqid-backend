// src/shared/constants/publicPaths.js

export const PUBLIC_PATHS = [
  '/api/auth/super-admin',
  '/api/auth/school',
  '/api/auth/send-otp',
  '/api/auth/verify-otp',
  '/api/auth/register/init',
  '/api/auth/register/verify',
  '/api/auth/refresh',
  '/health',
  '/api/admin/queues',
  '/s',
];

export const isPublicPath = (path) => {
  return PUBLIC_PATHS.some(
    (publicPath) => path === publicPath || path.startsWith(publicPath + '/')
  );
};
