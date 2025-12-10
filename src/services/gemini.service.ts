import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PromptAnalysis } from '../models/prompt-analysis.model.ts';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  constructor(private http: HttpClient) {}

  async analyzeStudentPrompt(studentPrompt: string): Promise<PromptAnalysis> {
    const resp$ = this.http.post<PromptAnalysis>('/api/gemini/analyze', { studentPrompt });
    return firstValueFrom(resp$);
  }
}
