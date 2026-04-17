import { randomBytes } from 'crypto';

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function randomSuffix(len = 4): string {
  return randomBytes(len).toString('hex').slice(0, len);
}
