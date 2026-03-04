import type { ClassValue } from "clsx";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const base = 1024;
  let exponent = Math.floor(Math.log(bytes) / Math.log(base));

  if (exponent >= units.length) {
    exponent = units.length - 1;
  }

  const size = bytes / Math.pow(base, exponent);
  const rounded = Math.round(size * 10) / 10; // Round to 1 decimal place

  return `${rounded} ${units[exponent]}`;
};

export const generateUUID = () => crypto.randomUUID();