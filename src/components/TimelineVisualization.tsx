'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { HistoricalEvent, TimelineBranch } from '../types/Timeline';

interface TimelineVisualizationProps {
  originalEvent: HistoricalEvent;
  branches: TimelineBranch[];
}

type Point = [number, number];

const generateZigzagPath = (startX: number, startY: number, endX: number, endY: number) => {
  const points: Point[] = [];
  const numSegments = 12 + Math.floor(Math.random() * 8); // Variable number of segments
  const baseAmplitude = 15; // Base zigzag amplitude
  
  // Start from exact point
  points.push([startX, startY]);

  // Create zigzag effect
  for (let i = 1; i < numSegments; i++) {
    const t = i / numSegments;
    const x = startX + (endX - startX) * t;
    const y = startY + (endY - startY) * t;
    
    // Add random displacement
    const progress = i / numSegments;
    const amplitude = baseAmplitude * Math.sin(progress * Math.PI); // Amplitude varies along the path
    const displacement = (Math.random() - 0.5) * amplitude;
    
    // Calculate perpendicular offset direction
    const dx = endX - startX;
    const dy = endY - startY;
    const perpX = -dy;
    const perpY = dx;
    const length = Math.sqrt(perpX * perpX + perpY * perpY);
    
    // Add point with displacement perpendicular to path direction
    points.push([
      x + (perpX / length) * displacement,
      y + (perpY / length) * displacement
    ]);
  }

  // Ensure we end at exact point
  points.push([endX, endY]);
  
  return points;
};

const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({ originalEvent, branches }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedEvent, setSelectedEvent] = useState<HistoricalEvent | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play();
        }

        setSelectedIndex(prev => {
          const totalEvents = branches[0]?.variants.length || 0;
          const newIndex = e.key === 'ArrowUp' 
            ? (prev - 1 + totalEvents) % totalEvents
            : (prev + 1) % totalEvents;

          // Highlight the newly selected path
          const svg = d3.select(svgRef.current);
          svg.selectAll("path")
            .style("filter", "drop-shadow(0 0 5px rgba(255, 71, 71, 0.3))")
            .attr("stroke-width", 2);
          
          svg.select(`.variant-path-${newIndex}`)
            .style("filter", "drop-shadow(0 0 15px rgba(255, 71, 71, 0.8))")
            .attr("stroke-width", 4);

          return newIndex;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [branches]);

  // Update selected event when index changes
  useEffect(() => {
    if (branches[0]?.variants[selectedIndex]) {
      setSelectedEvent(branches[0].variants[selectedIndex].events[0]);
    }
  }, [selectedIndex, branches]);

  useEffect(() => {
    if (!svgRef.current || !branches.length) return;

    const svg = d3.select(svgRef.current);
    
    // Get container dimensions
    const container = svgRef.current.parentElement;
    const width = container?.clientWidth || 1600;
    const height = container?.clientHeight || 1000;
    
    // Make timeline much bigger
    const radius = Math.min(width, height) * 1.2;

    svg.attr("width", width)
       .attr("height", height)
       .attr("viewBox", `0 0 ${width} ${height}`)
       .attr("preserveAspectRatio", "xMidYMid meet");

    const colors = {
      background: '#000000',
      sacred: '#FFD700',
      variant: '#FF4747',
      text: '#FFFFFF',
      highlight: '#FFB74D',
      glow: 'rgba(255, 71, 71, 0.3)'
    };

    svg.style('background-color', colors.background);
    svg.selectAll("*").remove();

    // Move timeline further left and adjust vertical position
    const timeline = svg.append("g")
      .attr("transform", `translate(${width * 0.15}, ${height * 0.5})`);

    // Adjust sacred timeline parameters
    const sacredPoints: Point[] = [];
    const numPoints = 40;
    for (let i = 0; i <= numPoints; i++) {
      const x = -radius * 0.1 + (2 * radius * (i / numPoints));
      const y = Math.sin(i * 0.2) * 15;
      sacredPoints.push([x, y]);
    }

    const sacredLine = timeline.append("path")
      .attr("d", d3.line<Point>()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveBasis)(sacredPoints))
      .attr("stroke", colors.sacred)
      .attr("stroke-width", 3)
      .attr("fill", "none")
      .style("filter", "drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))")
      .style("opacity", 0);

    // Store sacred timeline path element for later use
    const sacredPath = sacredLine.node() as SVGPathElement;

    sacredLine.transition()
      .duration(1000)
      .style("opacity", 1);

    // Draw original event on sacred timeline
    const originalEventNode = timeline.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 0)
      .attr("fill", colors.sacred)
      .style("filter", "drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))")
      .append("title")
      .text(originalEvent.title);

    originalEventNode.transition()
      .duration(500)
      .attr("r", 12);

    // Calculate variant positions with varying start points
    const totalVariants = branches.reduce((sum, branch) => sum + branch.variants.length, 0);
    let currentAngle = -Math.PI / 4;
    const angleStep = (Math.PI / 2) / (totalVariants - 1);

    branches.forEach((branch) => {
      branch.variants.forEach((variant, variantIndex) => {
        const branchGroup = timeline.append("g")
          .attr("class", "branch")
          .style("opacity", 0);

        // Calculate random start point along sacred timeline
        const startOffset = (Math.random() - 0.5) * radius * 1.5;
        
        // Find the exact point on the sacred timeline path
        const sacredLength = sacredPath.getTotalLength();
        const normalizedOffset = (startOffset + radius) / (radius * 2);
        const startPoint = sacredPath.getPointAtLength(sacredLength * normalizedOffset);
        const startX = startPoint.x;
        const startY = startPoint.y;

        // Create connecting dot at the exact intersection
        branchGroup.append("circle")
          .attr("cx", startX)
          .attr("cy", startY)
          .attr("r", 3)
          .attr("fill", colors.variant)
          .style("filter", "drop-shadow(0 0 3px rgba(255, 71, 71, 0.5))");

        // Adjust branch lengths to match new scale
        const branchLength = radius * (0.3 + Math.random() * 0.2);

        // Calculate branch end point with variation
        const endX = startX + branchLength * Math.cos(currentAngle);
        const endY = startY + branchLength * Math.sin(currentAngle);

        // Create variant path with zigzag effect
        const pathPoints = generateZigzagPath(startX, startY, endX, endY);
        
        const path = branchGroup.append("path")
          .attr("d", d3.line<Point>()
            .x(d => d[0])
            .y(d => d[1])
            .curve(d3.curveCardinal.tension(0.5))(pathPoints))
          .attr("stroke", colors.variant)
          .attr("stroke-width", 2)
          .attr("fill", "none")
          .attr("class", `variant-path-${variantIndex}`)
          .style("filter", "drop-shadow(0 0 5px rgba(255, 71, 71, 0.3))");

        // Add subtle animation to make the line appear to "flow"
        const totalLength = (path.node() as SVGPathElement).getTotalLength();
        path
          .attr("stroke-dasharray", totalLength)
          .attr("stroke-dashoffset", totalLength)
          .transition()
          .delay(500 + (variantIndex * 300))
          .duration(1000)
          .ease(d3.easeLinear)
          .attr("stroke-dashoffset", 0);

        branchGroup.style("opacity", 1);

        // Position events along the zigzag path
        variant.events.forEach((event, eventIndex) => {
          const t = (eventIndex + 1) / (variant.events.length + 1);
          
          // Calculate position along the actual zigzag path
          const pathLength = (path.node() as SVGPathElement).getTotalLength();
          const point = (path.node() as SVGPathElement).getPointAtLength(pathLength * t);
          
          // Add slight random offset to event positions
          const x = point.x + (Math.random() - 0.5) * 8;
          const y = point.y + (Math.random() - 0.5) * 8;

          const eventGroup = branchGroup.append("g")
            .attr("transform", `translate(${x}, ${y})`)
            .style("opacity", 0)
            .style("cursor", "pointer")
            .on("click", () => {
              setSelectedEvent(event);
              
              svg.selectAll("circle")
                .transition()
                .duration(300)
                .attr("stroke-width", 0);
              
              eventGroup.select("circle")
                .transition()
                .duration(300)
                .attr("stroke", colors.sacred)
                .attr("stroke-width", 2);
            });

          // Event circle with hover effect
          eventGroup.append("circle")
            .attr("r", 0)
            .attr("fill", colors.variant)
            .style("filter", "drop-shadow(0 0 5px rgba(255, 71, 71, 0.3))")
            .style("transition", "all 0.3s ease")
            .on("mouseover", function() {
              d3.select(this)
                .transition()
                .duration(300)
                .attr("r", 10);
            })
            .on("mouseout", function() {
              d3.select(this)
                .transition()
                .duration(300)
                .attr("r", 8);
            })
            .append("title")
            .text(`${event.title}\n${event.description}`);

          // Determine text anchor based on position
          const textAnchor = x > 0 ? "start" : "end";
          const textX = x > 0 ? 15 : -15;

          // Add event label and consequences
          const labelGroup = eventGroup.append("g");

          // Add background for text
          const textNode = labelGroup.append("text")
            .attr("x", textX)
            .attr("y", 5)
            .attr("text-anchor", textAnchor)
            .attr("font-size", "12px")
            .attr("fill", colors.text)
            .style("opacity", 0)
            .text(event.title);

          // Add consequences
          event.consequences.forEach((consequence, i) => {
            labelGroup.append("text")
              .attr("x", textX + (textAnchor === "end" ? -10 : 10))
              .attr("y", 20 + (i * 15))
              .attr("text-anchor", textAnchor)
              .attr("font-size", "10px")
              .attr("fill", 'rgba(255, 255, 255, 0.7)')
              .style("opacity", 0)
              .text(`• ${consequence}`)
              .transition()
              .delay(1200 + (variantIndex * 300) + (eventIndex * 200) + (i * 100))
              .duration(300)
              .style("opacity", 1);
          });

          // Add text background
          const totalHeight = 16 + (event.consequences.length * 15);
          const textWidth = Math.max(
            (textNode.node() as SVGTextElement)?.getBBox().width || 0,
            ...event.consequences.map(c => {
              const tempText = labelGroup.append("text").text(`• ${c}`);
              const width = tempText.node()?.getBBox().width || 0;
              tempText.remove();
              return width;
            })
          );

          labelGroup.insert("rect", "text")
            .attr("x", textAnchor === "end" ? -(textWidth + 25) : 13)
            .attr("y", -8)
            .attr("width", 0)
            .attr("height", totalHeight)
            .attr("fill", 'rgba(0, 0, 0, 0.8)')
            .attr("rx", 2)
            .style("stroke", colors.variant)
            .style("stroke-width", "1px")
            .transition()
            .delay(1000 + (variantIndex * 300) + (eventIndex * 200))
            .duration(500)
            .attr("width", textWidth + 15);

          // Animate text appearance
          textNode.transition()
            .delay(1100 + (variantIndex * 300) + (eventIndex * 200))
            .duration(300)
            .style("opacity", 1);

          // Add probability indicator
          if (eventIndex === 0) {
            const probGroup = eventGroup.append("g")
              .style("opacity", 0);

            const probX = textAnchor === "end" ? -45 : -25;
            
            probGroup.append("rect")
              .attr("x", probX)
              .attr("y", -20)
              .attr("width", 45)
              .attr("height", 16)
              .attr("fill", 'rgba(0, 0, 0, 0.8)')
              .attr("stroke", colors.highlight)
              .attr("stroke-width", "1px")
              .attr("rx", 2);

            probGroup.append("text")
              .attr("x", probX + 5)
              .attr("y", -8)
              .attr("font-size", "11px")
              .attr("fill", colors.highlight)
              .text(`${Math.round(variant.probability * 100)}%`);

            probGroup.transition()
              .delay(1200 + (variantIndex * 300))
              .duration(300)
              .style("opacity", 1);
          }
        });

        currentAngle += angleStep + (Math.random() - 0.5) * 0.2;
      });
    });

  }, [originalEvent, branches]);

  return (
    <div className="timeline-visualization">
      <audio ref={audioRef} src="/sounds/click.mp3" />
      <div className="corner-marker corner-marker-tl" />
      <div className="corner-marker corner-marker-tr" />
      <div className="corner-marker corner-marker-bl" />
      <div className="corner-marker corner-marker-br" />
      <div className="timeline-grid" />
      <div className="timeline-visualization-container">
        <svg ref={svgRef} viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid meet" />
      </div>
      
      <div className="events-list">
        <div className="events-header">
          <span>EVENT ID</span>
          <span>DATE</span>
          <span>TIME</span>
          <span>LOCATION</span>
        </div>
        <div className="events-content">
          {branches[0]?.variants.map((variant, index) => (
            <div 
              key={index}
              className={`event-row ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => {
                setSelectedIndex(index);
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play();
                }
                
                const svg = d3.select(svgRef.current);
                
                svg.selectAll("path")
                  .style("filter", "drop-shadow(0 0 5px rgba(255, 71, 71, 0.3))")
                  .attr("stroke-width", 2);
                
                svg.select(`.variant-path-${index}`)
                  .style("filter", "drop-shadow(0 0 15px rgba(255, 71, 71, 0.8))")
                  .attr("stroke-width", 4);
              }}
            >
              <span>{`${variant.id.slice(0, 8)}+${String(index).padStart(3, '0')}`}</span>
              <span>{new Date(variant.events[0].date).toLocaleDateString()}</span>
              <span>{new Date(variant.events[0].date).toLocaleTimeString()}</span>
              <span>{variant.events[0].location}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedEvent && (
        <div className="event-details-panel">
          <div className="event-details-header">
            <h3>{selectedEvent.title}</h3>
            <button 
              className="close-button"
              onClick={() => setSelectedEvent(null)}
            >
              ×
            </button>
          </div>
          <div className="event-details-content">
            <p className="event-description">{selectedEvent.description}</p>
            <h4>Consequences:</h4>
            <ul className="consequences-list">
              {selectedEvent.consequences.map((consequence, index) => (
                <li key={index}>{consequence}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineVisualization; 