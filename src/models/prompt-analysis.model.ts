
export interface ImprovedPrompt {
  role: string | null;
  context: string | null;
  task: string;
  exemplars: string[] | null;
  persona: string | null;
  format: string | null;
  tone: string | null;
}

export interface PromptAnalysis {
  score: number;
  feedback: string;
  improvedPrompt: ImprovedPrompt;
}