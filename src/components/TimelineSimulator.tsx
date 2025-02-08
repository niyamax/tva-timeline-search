import React, { useState, useRef, useEffect } from 'react';
import { HistoricalEvent, TimelineBranch } from '../types/Timeline';
import EventInput from './EventInput';
import TimelineVisualization from './TimelineVisualization';
import { generateTimelineVariants } from '../services/openai';
import Image from 'next/image';

const TimelineSimulator: React.FC = () => {
  const [originalEvent, setOriginalEvent] = useState<HistoricalEvent | null>(null);
  const [branches, setBranches] = useState<TimelineBranch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchAudioRef = useRef<HTMLAudioElement>(null);

  //Handle search sound
  useEffect(() => {
    if (isLoading && searchAudioRef.current) {
      searchAudioRef.current.currentTime = 0;
      searchAudioRef.current.loop = true;
      searchAudioRef.current.play();
    } else if (searchAudioRef.current) {
      searchAudioRef.current.pause();
      searchAudioRef.current.currentTime = 0;
    }
  }, [isLoading]);

  const handleEventSubmit = async (event: HistoricalEvent) => {
    setIsLoading(true);
    
    try {
      const variants = await generateTimelineVariants(event);
      const newBranch: TimelineBranch = {
        id: crypto.randomUUID(),
        originalEvent: event,
        variants
      };
      
      // Only update states after successful API call
      setOriginalEvent(event);
      setBranches([newBranch]);
    } catch (error) {
      console.error('Failed to generate variants:', error);
      // Optionally show error message to user
      alert('Failed to generate timeline variants. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="timeline-simulator">
      <audio ref={searchAudioRef} src='/sounds/search.mp3' />
      <div className="header-area">
        <Image 
          src="/tva_logo.png" 
          alt="TVA Logo" 
          width={80} 
          height={40}
          className="invert"
        />
      </div>
      <div className="input-panel">
        <EventInput onSubmit={handleEventSubmit} />
      </div>
      <div className="visualization-area">
        <div className="timeline-grid" />
        {isLoading ? (
          <div className="loading-indicator">
            <div className="loading-spinner"></div>
            <p>Analyzing timeline variants...</p>
          </div>
        ) : (
          originalEvent && branches.length > 0 && (
            <TimelineVisualization 
              originalEvent={originalEvent}
              branches={branches}
            />
          )
        )}
      </div>
    </div>
  );
};

export default TimelineSimulator; 