import { formatDistanceToNow } from 'date-fns';

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 11) return 'Good morning';
  if (hour >= 12 && hour <= 16) return 'Good afternoon';
  return 'Good evening';
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours} hr ${minutes} min`;
  return `${minutes} min`;
}

export function formatRelativeTime(isoDate: string): string {
  return formatDistanceToNow(new Date(isoDate), { addSuffix: true });
}
