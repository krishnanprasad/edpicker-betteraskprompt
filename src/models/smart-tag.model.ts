export type Intent = 'learn' | 'test' | 'revise' | 'doubt';

export type TagCategory = 'Persona Style' | 'Add Context' | 'Task Instruction' | 'Format Constraints' | 'Reasoning Help';

export interface SmartTag {
  text: string;
  category: TagCategory;
}

export interface OutputTagItem {
  id: string;
  text: string;
  isDefault: boolean;
  selected: boolean;
}

export interface SmartTagsResponse {
  success: boolean;
  groups?: {
    personaStyle: string[];
    addContext: string[];
    taskInstruction: string[];
    formatConstraints: string[];
    reasoningHelp: string[];
  };
  tags: string[]; // Flat list for backward compatibility or simple use
  fallback?: boolean;
  message?: string;
  metadata?: DetectedMeta;
}

export interface OutputSuggestionsResponse {
  success: boolean;
  suggestions: string[];
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
