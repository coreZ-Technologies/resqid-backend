import { customAlphabet } from 'nanoid';

const token = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 5);

// RQ-SCH-A3X9K
export const generateSchoolId = () => `RQ-SCH-${token()}`;

// RQ-ADM-A3X9K-F2NX8
export const generateAdminId = (schoolToken) => `RQ-ADM-${schoolToken}-${token()}`;

// RQ-TCH-A3X9K-B7M2P
export const generateTeacherId = (schoolToken) => `RQ-TCH-${schoolToken}-${token()}`;

// RQ-STU-A3X9K-2025-K9QW3
export const generateStudentId = (schoolToken, year = new Date().getFullYear()) =>
  `RQ-STU-${schoolToken}-${year}-${token()}`;

// RQ-PAR-F2NX8R  (platform-level, no school scope)
export const generateParentId = () =>
  `RQ-PAR-${customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6)()}`;
