import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  try {
    const { title } = await request.json();
    
    const completion = await openai.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a historical analysis AI that generates alternative timelines."
        },
        { 
          role: "user", 
          content: `Analyze this historical event: "${title}" and generate:
            1. Basic historical facts (date, location, description)
            2. Five alternative timelines with their consequences.
            
            Format response as JSON with this structure:
            {
              "historical_facts": {
                "date": "YYYY-MM-DD",
                "location": "place",
                "description": "text"
              },
              "timelines": [{
                "description": "text",
                "probability": 0.0 to 1.0,
                "consequentialEvents": [{
                  "title": "text",
                  "description": "text",
                  "timeOffset": "number days/months/years",
                  "consequences": ["text", "text", "text"]
                }]
              }]
            }`
        }
      ],
      model: "gpt-3.5-turbo",
      temperature: 0.9,
      stream: true,
    });

    let fullResponse = '';
    
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullResponse += content;
    }

    try {
      const responseData = JSON.parse(fullResponse);
      
      // Validate the response structure
      if (!responseData.historical_facts || !responseData.timelines) {
        throw new Error('Invalid response structure from OpenAI');
      }

      return NextResponse.json(responseData);
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      return NextResponse.json(
        { error: 'Failed to parse OpenAI response' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error details:', error);
    return NextResponse.json(
      { error: 'Failed to generate timelines' },
      { status: 500 }
    );
  }
} 