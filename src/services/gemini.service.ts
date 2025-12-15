import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PromptAnalysis } from '../models/prompt-analysis.model';
import { environment } from '../environments/environment';

// Define interface for Tag Response
export interface TagResponse {
  success: boolean;
  tags: string[];
  metadata?: any;
  fallback?: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  constructor(private http: HttpClient) {}

  async generateSmartTags(params: {
    topic: string;
    intent: string;
    persona: string;
    stage: number;
    selectedTags?: string[];
    avoidDuplicates?: boolean;
  }): Promise<TagResponse> {
    const endpoint = `${environment.apiBase}/tags/generate`;
    try {
      const resp$ = this.http.post<{ tags: string[] }>(endpoint, params);
      const result = await firstValueFrom(resp$);
      return { success: true, tags: result.tags };
    } catch (error) {
      console.error('Failed to generate tags:', error);
      return { success: false, tags: [] };
    }
  }

  async analyzeStudentPrompt(studentPrompt: string): Promise<PromptAnalysis> {
    const isDev = isDevMode();
    const endpoint = `${environment.apiBase}/gemini/analyze`;
    
    if (isDev) {
      console.log('\n🚀 [FRONTEND] Initiating API call');
      console.log('   Prompt:', studentPrompt.substring(0, 50) + (studentPrompt.length > 50 ? '...' : ''));
      console.log('   Prompt length:', studentPrompt.length, 'characters');
      console.log('   Timestamp:', new Date().toISOString());
    }
    
    try {
      const startTime = Date.now();
      const resp$ = this.http.post<PromptAnalysis>(endpoint, { studentPrompt });
      const result = await firstValueFrom(resp$);
      const responseTime = Date.now() - startTime;
      
      if (isDev) {
        console.log('\n✅ [FRONTEND] API call successful');
        console.log('   Response time:', responseTime, 'ms');
        console.log('   Score received:', result.score);
        console.log('   Feedback length:', result.feedback?.length || 0, 'characters');
        console.log('   Has improved prompt:', !!result.improvedPrompt);
        console.log('─────────────────────────────────────────\n');
      }
      
      return result;
    } catch (error) {
      if (isDev) {
        console.error('\n❌ [FRONTEND] API call failed');
        console.error('   Error type:', error instanceof HttpErrorResponse ? 'HTTP Error' : 'Unknown Error');
      }
      
      if (error instanceof HttpErrorResponse) {
        if (isDev) {
          console.error('   HTTP Status:', error.status);
          console.error('   Status text:', error.statusText);
          console.error('   Error body:', error.error);
          console.error('   URL:', error.url);
        }
        
        // 401: Authentication/API key issues
        if (error.status === 401) {
          if (isDev) {
            console.error('\n🔴 [DIAGNOSIS] Authentication failed');
            console.error('   Reason: Invalid or expired Gemini API key');
            console.error('   Action: Check GEMINI_API_SECRET in backend .env file');
            console.error('   Get new key: https://aistudio.google.com/apikey');
            console.error('─────────────────────────────────────────\n');
          }
          throw new Error('Authentication failed. Please check API configuration.');
        } 
        
        // 429: Rate limit/quota exceeded
        else if (error.status === 429) {
          if (isDev) {
            console.error('\n🔴 [DIAGNOSIS] Rate limit or quota exceeded');
            console.error('   Reason: Too many requests or API quota exhausted');
            console.error('   Action: Wait 60 seconds and try again, or upgrade API plan');
            console.error('   Details:', error.error?.details || 'No additional details');
            console.error('─────────────────────────────────────────\n');
          }
          throw new Error('API quota exceeded. Please try again in a minute.');
        } 
        
        // 403: Permission/model access denied
        else if (error.status === 403) {
          if (isDev) {
            console.error('\n🔴 [DIAGNOSIS] Access forbidden');
            console.error('   Reason: Model access denied or insufficient permissions');
            console.error('   Action: Verify API key has access to gemini-2.5-flash model');
            console.error('   Details:', error.error?.details || 'No additional details');
            console.error('─────────────────────────────────────────\n');
          }
          throw new Error('Access denied. Model may not be available for your API key.');
        }
        
        // 500: Server error
        else if (error.status === 500) {
          const errorMsg = error.error?.details || error.error?.error || 'Server error occurred';
          if (isDev) {
            console.error('\n🔴 [DIAGNOSIS] Server error');
            console.error('   Reason:', errorMsg);
            console.error('   Action: Check backend server console for detailed logs');
            console.error('─────────────────────────────────────────\n');
          }
          throw new Error(`Server error: ${errorMsg}`);
        } 
        
        // 503: Service unavailable
        else if (error.status === 503) {
          if (isDev) {
            console.error('\n🔴 [DIAGNOSIS] Service unavailable');
            console.error('   Reason: Cannot reach Gemini API');
            console.error('   Action: Check internet connection');
            console.error('─────────────────────────────────────────\n');
          }
          throw new Error('Service temporarily unavailable. Check your internet connection.');
        }
        
        // 0: Connection refused (backend not running)
        else if (error.status === 0) {
          if (isDev) {
            console.error('\n🔴 [DIAGNOSIS] Cannot connect to backend');
            console.error('   Reason: Backend server is not running or unreachable');
            console.error('   Action: Start backend with: npm run server:start');
            console.error('   Expected URL: http://localhost:3001');
            console.error('─────────────────────────────────────────\n');
          }
          throw new Error('Backend server is not running. Please start the server.');
        }
        
        // Other HTTP errors
        if (isDev) {
          console.error('\n🔴 [DIAGNOSIS] Unexpected HTTP error');
          console.error('   Status:', error.status);
          console.error('   Message:', error.error?.error || error.message);
          console.error('─────────────────────────────────────────\n');
        }
        throw new Error(error.error?.error || error.message || 'An unexpected error occurred');
      }
      
      // Non-HTTP errors
      if (isDev) {
        console.error('\n🔴 [DIAGNOSIS] Non-HTTP error');
        console.error('   Error:', error);
        console.error('─────────────────────────────────────────\n');
      }
      throw error;
    }
  }


}