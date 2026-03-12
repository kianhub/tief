export type TopicCategory =
  | 'philosophy'
  | 'science'
  | 'relationships'
  | 'creativity'
  | 'psychology'
  | 'culture'
  | 'career'
  | 'nature'
  | 'history'
  | 'spirituality'
  | 'random';

export interface Category {
  id: TopicCategory;
  label: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: 'philosophy', label: 'Philosophy', color: '#7B6FA0' },
  { id: 'science', label: 'Science', color: '#5B8FA8' },
  { id: 'relationships', label: 'Relationships', color: '#C4785B' },
  { id: 'creativity', label: 'Creativity', color: '#B88A4A' },
  { id: 'psychology', label: 'Psychology', color: '#6B9F7B' },
  { id: 'culture', label: 'Culture', color: '#A0705B' },
  { id: 'career', label: 'Career', color: '#5C7B8A' },
  { id: 'nature', label: 'Nature', color: '#6B8F5B' },
  { id: 'history', label: 'History', color: '#8A7560' },
  { id: 'spirituality', label: 'Spirituality', color: '#8B7BA0' },
  { id: 'random', label: 'Random', color: '#C4785B' },
] as const;
