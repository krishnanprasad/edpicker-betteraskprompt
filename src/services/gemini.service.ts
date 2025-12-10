
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from "@google/genai";
import { PromptAnalysis } from '../models/prompt-analysis.model.ts';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private readonly genAI: GoogleGenAI;
  
  constructor() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY environment variable not set.");
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }

  async analyzeStudentPrompt(studentPrompt: string): Promise<PromptAnalysis> {
    const systemInstruction = `You are an expert prompt engineering coach for high school and college students. Your goal is to analyze a student's prompt and help them improve it for better results from AI models. Evaluate the provided prompt on a scale of 0 to 100 based on its clarity, context, specificity, and inclusion of key elements like role, format, and tone. A score of 0 is a very poor, vague prompt, while 100 is a perfect, highly-detailed prompt. Provide constructive feedback and generate an improved version of the prompt, breaking it down into its core components (role, context, task, etc.). Your response must be a single, valid JSON object.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        score: {
          type: Type.NUMBER,
          description: "A score from 0-100 evaluating the prompt's quality."
        },
        feedback: {
          type: Type.STRING,
          description: "Constructive feedback explaining the score and suggesting areas for improvement."
        },
        improvedPrompt: {
          type: Type.OBJECT,
          description: "A structured, improved version of the student's prompt.",
          properties: {
            role: { type: Type.STRING, description: "The role the AI should assume. E.g., 'an expert historian'." },
            context: { type: Type.STRING, description: "Background information or context for the task." },
            task: { type: Type.STRING, description: "The main task the AI should perform, rephrased for clarity." },
            exemplars: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Examples of the desired output." },
            persona: { type: Type.STRING, description: "The persona the AI should adopt in its response." },
            format: { type: Type.STRING, description: "The desired output format. E.g., 'a 5-paragraph essay', 'a JSON object'." },
            tone: { type: Type.STRING, description: "The desired tone of the response. E.g., 'formal', 'persuasive', 'casual'." },
          },
          required: ["task"]
        }
      },
      required: ["score", "feedback", "improvedPrompt"]
    };

    try {
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Please analyze this student's prompt: "${studentPrompt}"`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.3,
          thinkingConfig: { thinkingBudget: 0 }
        }
      });
      
      const jsonText = response.text.trim();
      const parsedResponse = JSON.parse(jsonText);

      const improvedPrompt = parsedResponse.improvedPrompt || {};
      return {
        ...parsedResponse,
        improvedPrompt: {
          role: improvedPrompt.role || null,
          context: improvedPrompt.context || null,
          task: improvedPrompt.task || studentPrompt,
          exemplars: improvedPrompt.exemplars || null,
          persona: improvedPrompt.persona || null,
          format: improvedPrompt.format || null,
          tone: improvedPrompt.tone || null,
        }
      };

    } catch (error) {
      console.error('Error analyzing prompt:', error);
      throw new Error('Failed to get analysis from Gemini API. Please check your API key and network connection.');
    }
  }
}
