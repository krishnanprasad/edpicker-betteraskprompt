export type Intent = 'Learn' | 'Prepare for Test' | 'Revise' | 'Clear Doubt';

export type TagCategory = 'Role' | 'Context' | 'Output' | 'Tone' | 'Thinking';

export interface SmartTag {
  category: TagCategory;
  value: string;
  description?: string;
}

export interface SmartTagResponse {
  tags: SmartTag[];
}

export interface SmartTagRequest {
  intent: Intent;
  topic: string;
}

export interface GeneratedPrompt {
  prompt: string;
  selectedTags: SmartTag[];
}
