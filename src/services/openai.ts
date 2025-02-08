import { HistoricalEvent, TimelineBranch } from '../types/Timeline';

interface OpenAIResponse {
  historical_facts: {
    date: string;
    location: string;
    description: string;
  };
  timelines: {
    description: string;
    probability: number;
    consequentialEvents: {
      title: string;
      description: string;
      timeOffset: string;
      consequences: string[];
    }[];
  }[];
}

export async function generateTimelineVariants(event: HistoricalEvent): Promise<TimelineBranch['variants']> {
  try {
    const response = await fetch('/api/generate-timelines', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: event.title }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate timelines');
    }

    const data = await response.json() as OpenAIResponse;

    // Update the original event with AI-generated details
    event.date = new Date(data.historical_facts.date);
    event.location = data.historical_facts.location;
    event.description = data.historical_facts.description;

    // Transform OpenAI response into our app's format
    return data.timelines.map(timeline => ({
      id: crypto.randomUUID(),
      parentEventId: event.id,
      probability: timeline.probability,
      description: timeline.description,
      events: [{
        id: crypto.randomUUID(),
        title: timeline.description,
        description: timeline.consequentialEvents[0].description,
        date: new Date(event.date.getTime() + parseTimeOffset(timeline.consequentialEvents[0].timeOffset)),
        location: event.location,
        consequences: timeline.consequentialEvents[0].consequences
      }]
    }));

  } catch (error) {
    console.error('Error generating timelines:', error);
    throw error;
  }
}

function parseTimeOffset(offset: string): number {
  const value = parseInt(offset);
  if (offset.includes('year')) return value * 365 * 24 * 60 * 60 * 1000;
  if (offset.includes('month')) return value * 30 * 24 * 60 * 60 * 1000;
  if (offset.includes('day')) return value * 24 * 60 * 60 * 1000;
  return 0;
} 