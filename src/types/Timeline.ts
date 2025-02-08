export interface HistoricalEvent {
  id: string;
  date: Date;
  title: string;
  description: string;
  location: string;
  consequences: string[];
}

export interface TimelineVariant {
  id: string;
  parentEventId: string;
  probability: number;
  description: string;
  events: HistoricalEvent[];
}

export interface TimelineBranch {
  id: string;
  originalEvent: HistoricalEvent;
  variants: TimelineVariant[];
} 