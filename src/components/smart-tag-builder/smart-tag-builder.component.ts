import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SmartTagService } from '../../services/smart-tag.service';
import { Intent, SmartTag, TagCategory } from '../../models/smart-tag.model';

@Component({
  selector: 'app-smart-tag-builder',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './smart-tag-builder.component.html',
  styleUrls: ['./smart-tag-builder.component.css']
})
export class SmartTagBuilderComponent {
  intents: Intent[] = ['Learn', 'Prepare for Test', 'Revise', 'Clear Doubt'];
  
  selectedIntent = signal<Intent | null>(null);
  topic = signal<string>('');
  isLoading = signal<boolean>(false);
  error = signal<string>('');
  
  availableTags = signal<SmartTag[]>([]);
  selectedTags = signal<SmartTag[]>([]);
  generatedPrompt = signal<string>('');

  constructor(private smartTagService: SmartTagService) {}

  selectIntent(intent: Intent) {
    this.selectedIntent.set(intent);
  }

  setTopic(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.topic.set(target.value);
  }

  async generateTags() {
    if (!this.selectedIntent() || !this.topic().trim()) {
      this.error.set('Please select an intent and enter a topic');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');
    
    try {
      const response = await this.smartTagService.generateSmartTags({
        intent: this.selectedIntent()!,
        topic: this.topic()
      });
      
      this.availableTags.set(response.tags);
      this.selectedTags.set([]);
      this.generatedPrompt.set('');
    } catch (err: any) {
      this.error.set(err.message || 'Failed to generate smart tags');
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleTag(tag: SmartTag) {
    const current = this.selectedTags();
    const index = current.findIndex(t => t.category === tag.category && t.value === tag.value);
    
    if (index > -1) {
      // Remove tag
      this.selectedTags.set(current.filter((_, i) => i !== index));
    } else {
      // Add tag (max 5)
      if (current.length < 5) {
        this.selectedTags.set([...current, tag]);
      }
    }
    
    this.updateGeneratedPrompt();
  }

  isTagSelected(tag: SmartTag): boolean {
    return this.selectedTags().some(t => t.category === tag.category && t.value === tag.value);
  }

  getTagsByCategory(category: TagCategory): SmartTag[] {
    return this.availableTags().filter(t => t.category === category);
  }

  updateGeneratedPrompt() {
    const tags = this.selectedTags();
    if (tags.length === 0) {
      this.generatedPrompt.set('');
      return;
    }

    const parts: string[] = [];
    const topic = this.topic();
    
    tags.forEach(tag => {
      parts.push(tag.value);
    });
    
    const prompt = `${parts.join(' ')} Topic: ${topic}`;
    this.generatedPrompt.set(prompt);
  }

  copyPrompt() {
    navigator.clipboard.writeText(this.generatedPrompt());
  }

  shareToWhatsApp() {
    const text = encodeURIComponent(this.generatedPrompt());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  reset() {
    this.selectedIntent.set(null);
    this.topic.set('');
    this.availableTags.set([]);
    this.selectedTags.set([]);
    this.generatedPrompt.set('');
    this.error.set('');
  }
}
