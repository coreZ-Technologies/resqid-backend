import crypto from 'crypto';

export const generateOtp = () => crypto.randomInt(100000, 999999);

export const generateOtpExpiry = (minutes = 10) => new Date(Date.now() + minutes * 60 * 1000);

export const isOtpExpired = (expiry) => new Date() > new Date(expiry);
