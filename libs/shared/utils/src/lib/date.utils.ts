// Date Utility Functions

import { format, formatDistance, isToday as isTodayFns, isPast, isFuture } from 'date-fns';

export function formatDate(date: Date | string, pattern = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, pattern);
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
}

export function formatDateTimeFull(date: Date | string): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm:ss');
}

export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return isTodayFns(dateObj);
}

export function timeAgo(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true });
}

export function isPastDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return isPast(dateObj);
}

export function isFutureDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return isFuture(dateObj);
}
