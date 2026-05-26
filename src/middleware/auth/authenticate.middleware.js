import jwt from 'jsonwebtoken';
import { prisma } from '#config/prisma.js';
import { ApiError } from '#shared/response/ApiError.js';

/**
 * Verifies JWT token from Authorization header.
 * Attaches decoded user to req.user.
 *
 * req.user shape:
 * {
 *   id:       'user_123',
 *   role:     'TEACHER',
 *   schoolId: 'school_abc',   ← null for SUPER_ADMIN
 * }
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') throw ApiError.unauthorized('Token expired');
      throw ApiError.unauthorized('Invalid token');
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, schoolId: true, isActive: true },
    });

    if (!user) throw ApiError.unauthorized('User not found');
    if (!user.isActive) throw ApiError.unauthorized('Account deactivated');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
