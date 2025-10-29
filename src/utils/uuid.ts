import { validate } from 'uuid';

export const isUUIDv4 = (str: string | undefined | null): boolean => {
     if (!str) return false;
     return validate(str.trim()) && str.trim().split('-').length === 5;
};
