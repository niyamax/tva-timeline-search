import React, { useState } from 'react';
import { HistoricalEvent } from '../types/Timeline';

interface EventInputProps {
  onSubmit: (event: HistoricalEvent) => void;
}

const EventInput: React.FC<EventInputProps> = ({ onSubmit }) => {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEvent: HistoricalEvent = {
      id: crypto.randomUUID(),
      date: new Date(), // This will be updated by OpenAI response
      title: title,
      description: '', // This will be filled by OpenAI response
      location: '', // This will be filled by OpenAI response
      consequences: []
    };
    onSubmit(newEvent);
  };

  return (
    <form className="event-input" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Search a historical event (e.g.,'Moon Landing')"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <button type="submit">Search</button>
    </form>
  );
};

export default EventInput; 