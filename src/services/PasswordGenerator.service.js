import { customAlphabet } from 'nanoid';

const upperChars = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ', 3);
const lowerChars = customAlphabet('abcdefghjklmnpqrstuvwxyz', 3);
const numberChars = customAlphabet('23456789', 2);
const specialChars = customAlphabet('!@#$%', 1);

// shuffle helper
const shuffle = (str) =>
  str
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');

// RQ@School#A3X -> readable, policy-compliant, not guessable
export const generateDefaultPassword = () => {
  const raw = upperChars() + lowerChars() + numberChars() + specialChars();
  return shuffle(raw); // 9 chars, mixed
};
