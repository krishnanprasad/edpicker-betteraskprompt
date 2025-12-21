import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SmartTagService } from '../../services/smart-tag.service';
import { Intent, TagCategory } from '../../models/smart-tag.model';
import { OnboardingOverlayComponent } from '../onboarding-overlay/onboarding-overlay.component';

@Component({
  selector: 'app-smart-tag-builder',
  standalone: true,
  imports: [CommonModule, OnboardingOverlayComponent],
  templateUrl: './smart-tag-builder.component.html',
  styleUrls: ['./smart-tag-builder.component.css']
})
export class SmartTagBuilderComponent {
  // Intent options with display labels
  intentOptions: { value: Intent; label: string }[] = [
    { value: 'learn', label: 'Learn' },
    { value: 'test', label: 'Prepare for Test' },
    { value: 'revise', label: 'Revise' },
    { value: 'doubt', label: 'Clear Doubt' }
  ];

  // Category configurations with colors
  categoryConfig: Record<TagCategory, { label: string; color: string; bgLight: string; bgSelected: string; border: string; borderSelected: string }> = {
    'Persona Style': {
      label: 'PERSONA',
      color: 'text-orange-700',
      bgLight: 'bg-orange-50',
      bgSelected: 'bg-orange-100',
      border: 'border-orange-300',
      borderSelected: 'border-orange-600'
    },
    'Add Context': {
      label: 'CONTEXT',
      color: 'text-blue-700',
      bgLight: 'bg-blue-50',
      bgSelected: 'bg-blue-100',
      border: 'border-blue-300',
      borderSelected: 'border-blue-600'
    },
    'Format Constraints': {
      label: 'FORMAT',
      color: 'text-green-700',
      bgLight: 'bg-green-50',
      bgSelected: 'bg-green-100',
      border: 'border-green-300',
      borderSelected: 'border-green-600'
    },
    'Task Instruction': {
      label: 'TASK',
      color: 'text-purple-700',
      bgLight: 'bg-purple-50',
      bgSelected: 'bg-purple-100',
      border: 'border-purple-300',
      borderSelected: 'border-purple-600'
    },
    'Reasoning Help': {
      label: 'REASONING',
      color: 'text-pink-700',
      bgLight: 'bg-pink-50',
      bgSelected: 'bg-pink-100',
      border: 'border-pink-300',
      borderSelected: 'border-pink-600'
    }
  };

  // Copy state management
  copySuccess = signal<boolean>(false);
  // showPresetBanner = signal<boolean>(false); // Removed as per requirement

  constructor(public tagService: SmartTagService) {
    // Removed auto-preset banner logic
    /*
    if (tagService.hasPreset() && !tagService.isOnboardingComplete()) {
      setTimeout(() => {
        this.showPresetBanner.set(true);
      }, 1000);
    }
    */
  }
  
  // Load last preset
  useLastSetup() {
    this.tagService.loadLastPreset();
    // this.showPresetBanner.set(false);
  }
  
  /*
  dismissPresetBanner() {
    this.showPresetBanner.set(false);
  }
  */

  clearSession() {
    this.tagService.clearSession();
  }
  
  // Use recent prompt
  useRecentPrompt(recent: { topic: string; prompt: string; timestamp: number }) {
    this.tagService.useRecentPrompt(recent);
  }
  
  // Show onboarding tutorial
  showTutorial() {
    this.tagService.showOnboardingTutorial();
  }

  // Intent selection
  selectIntent(intent: Intent) {
    this.tagService.setIntent(intent);
  }

  // Topic input with auto-detection and debounced loading
  onTopicInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.tagService.setTopic(target.value);
  }

  // Tag selection toggle
  toggleTag(tagId: string) {
    this.tagService.toggleTagSelection(tagId);
  }

  // Check if tag is selected
  isTagSelected(tagId: string): boolean {
    return this.tagService.selectedTags().some(t => t.id === tagId);
  }

  // Get tags by category
  getTagsByCategory(category: TagCategory) {
    return this.tagService.availableTags().filter(t => t.category === category);
  }

  // Get category display config
  getCategoryConfig(category: TagCategory) {
    return this.categoryConfig[category];
  }

  // Refresh tags for a specific category (optional feature)
  async refreshCategory(category: TagCategory) {
    // This would call the backend to regenerate just this category
    // For now, it reloads all tags
    await this.tagService.loadSmartTags();
  }
  
  // Output tag methods
  toggleOutputTag(tagId: string) {
    this.tagService.toggleOutputTagSelection(tagId);
  }
  
  isOutputTagSelected(tagId: string): boolean {
    return this.tagService.selectedOutputTags().some(t => t.id === tagId);
  }

  // Generate final prompt
  async generateFinalPrompt() {
    await this.tagService.generatePrompt();
  }

  // Copy prompt to clipboard with success animation
  async copyPrompt() {
    const prompt = this.tagService.finalPrompt();
    if (prompt) {
      try {
        await navigator.clipboard.writeText(prompt);
        this.copySuccess.set(true);
        
        // Reset after 3 seconds
        setTimeout(() => {
          this.copySuccess.set(false);
        }, 3000);
      } catch (err) {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
      }
    }
  }

  // Share on WhatsApp with formatted message
  shareOnWhatsApp() {
    const prompt = this.tagService.finalPrompt();
    const topic = this.tagService.topic();
    const productUrl = 'https://krishnanprasad.github.io/edpicker-betteraskprompt/';
    
    if (prompt && topic) {
      const formattedMessage = `📚 Study Prompt I just made:
"Explain ${topic}"

🤖 AI Prompt:
${prompt}

✨ Make your own → ${productUrl}`;
      
      const encodedMessage = encodeURIComponent(formattedMessage);
      window.open(`https://api.whatsapp.com/send?text=${encodedMessage}`, '_blank');
    }
  }

  // Reset all
  reset() {
    this.tagService.reset();
    this.copySuccess.set(false);
  }
}
