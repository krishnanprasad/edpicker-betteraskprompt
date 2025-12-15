import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const router = express.Router();
const isDevelopment = process.env.NODE_ENV !== 'production';

const apiKey = process.env.GEMINI_API_SECRET;
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Fallback/Static data for when AI fails or is unavailable
// This mirrors the frontend structure for consistency
const FALLBACK_TAGS: Record<string, Record<string, string[]>> = {
  'Teacher': {
    'Generate Questions': ['Multiple Choice Questions', 'Critical Thinking Tasks', 'Real World Application', 'Blooms Taxonomy Levels', 'Include Answer Key'],
    'Create Explanation': ['Step By Step Guide', 'Include Visual Aids', 'Real Life Examples', 'Common Student Mistakes', 'Interactive Class Elements'],
    'Simplify Weak': ['Focus Core Concepts', 'Use Visual Analogies', 'Easy Practice Problems', 'Build Student Confidence', 'Step By Step Guide'],
    'Use Analogy': ['Everyday Life Analogy', 'Sports Related Analogy', 'Cooking Baking Analogy', 'Nature Based Analogy', 'Modern Tech Analogy'],
    'Latest Research': ['Key Research Findings', 'Research Methodology Details', 'Practical Classroom Implications', 'Brief Research Summary', 'Include Academic Citations']
  },
  'Parents': {
    'Help Homework': ['Step By Step Guide', 'Dont Solve Directly', 'Ask Guiding Questions', 'Offer Encouragement Words', 'Check Child Understanding'],
    'Help Project': ['Brainstorming Session Ideas', 'Required Materials List', 'Project Timeline Plan', 'Creative Project Ideas', 'Safety Precautions Tips'],
    'Explain Simply': ['Explain Like Five', 'Real World Examples', 'No Complex Jargon', 'Use Visual Aids', 'Include Fun Facts'],
    'Find Resources': ['Educational Video Links', 'Readable Article Links', 'Learning Game Links', 'Book Recommendations List', 'Printable Worksheet Links'],
    'Play & Learn': ['Educational Game Ideas', 'Outdoor Activity Ideas', 'DIY Craft Project', 'Home Science Experiment', 'Interactive Storytelling Time']
  },
  'Students': {
    'Homework Help': ['Explain Core Concept', 'Give Helpful Hint', 'Show Similar Example', 'Step By Step Guide', 'Check My Answer'],
    'Project Ideas': ['Creative Project Ideas', 'Feasible For Student', 'Unique Project Angle', 'Science Fair Project', 'Artistic Project Ideas'],
    'Learn Concept': ['Deep Dive Explanation', 'Brief Topic Summary', 'Key Learning Points', 'Quiz Me Now', 'Real World Examples'],
    'Exam Prep': ['Practice Exam Questions', 'Flashcard Study Points', 'One Page Summary', 'Time Management Tips', 'List Key Formulas'],
    'Clear Doubt': ['Simple Clear Explanation', 'Use Simple Analogy', 'Show Concrete Example', 'Describe Visual Diagram', 'Explain Why How']
  }
};

router.post('/generate', async (req: Request, res: Response) => {
  const { topic, intent, persona, stage, selectedTags = [], visibleTags = [] } = req.body;

  if (isDevelopment) {
    console.log('\n📥 [INCOMING REQUEST] /api/tags/generate');
    console.log('   Params:', { topic, intent, persona, stage });
  }

  // 1. Validation
  if (!topic || !intent || !persona) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  // 2. Fallback if no API key
  if (!genAI) {
    if (isDevelopment) console.warn('⚠️ Gemini API not configured');
    return res.json({ success: false, tags: [], fallback: true, message: 'Gemini API not configured' });
  }

  try {
    // 3. Construct Prompt
    const count = stage === 1 ? 3 : 5;
    const existingTags = [...new Set([...selectedTags, ...visibleTags])];
    
    const systemInstruction = `You are an expert educational prompt engineer. Your task is to generate "Smart Tags" - short, action-oriented suggestions that help a user refine their prompt.
    
    Constraints:
    1. Each tag must be exactly 3 to 4 words long.
    2. Each tag must start with a strong verb (e.g., Include, Add, Explain, Give, Use, Make, Provide, Compare, Highlight).
    3. Tags must be safe for students and appropriate for a school setting.
    4. Do NOT duplicate any of these existing tags: ${existingTags.join(', ')}.
    5. Return exactly ${count} tags.
    `;

    const userPrompt = `Generate ${count} smart tags for a prompt about "${topic}".
    Persona: ${persona}
    Intent: ${intent}
    Stage: ${stage} (1 = Initial suggestions, 2 = Follow-up suggestions)`;

    // 4. Define Schema
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        tags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of generated smart tags"
        }
      },
      required: ["tags"]
    };

    // 5. Call Gemini
    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.7
      }
    });

    // 6. Parse Response
    const responseText = (result as any).text?.() ?? (result as any).text ?? '';
    const data = JSON.parse(responseText);
    let generatedTags: string[] = data.tags || [];

    if (isDevelopment) {
      console.log('   Raw Tags:', generatedTags);
    }

    // 7. Validate Tags (Word count & Verb check)
    generatedTags = generatedTags.filter(tag => {
      const words = tag.trim().split(/\s+/);
      const wordCount = words.length;
      // Check word count (3-4)
      if (wordCount < 3 || wordCount > 4) return false;
      return true;
    });

    if (generatedTags.length === 0) {
       throw new Error('No valid tags generated after validation');
    }

    // Limit to requested count
    const finalTags = generatedTags.slice(0, count);

    res.json({
      success: true,
      tags: finalTags,
      fallback: false
    });

  } catch (error) {
    console.error('Gemini Tag Generation Error:', error);
    res.json({
      success: false,
      tags: [],
      fallback: true,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
