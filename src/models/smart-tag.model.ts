export type Intent = 'learn' | 'test' | 'revise' | 'doubt';

export type TagCategory = 'role' | 'context' | 'output' | 'tone' | 'thinking';

export interface SmartTagsResponse {
  success?: boolean;
  role: string[];
  context: string[];
  output: string[];
  tone: string[];
  thinking: string[];
  tags?: {
    role: string[];
    context: string[];
    output: string[];
    tone: string[];
    thinking: string[];
  };
  metadata?: DetectedMeta;
  fallback?: boolean;
  message?: string;
}

export interface DetectedMeta {
  class?: number;
  board?: string;
  subject?: string;
}

export interface TagItem {
  id: string;
  text: string;
  category: TagCategory;
  selected: boolean;
}

export interface PromptRequest {
  topic: string;
  selectedTags: string[];
  intent: Intent;
}
