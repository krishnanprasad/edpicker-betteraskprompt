import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SmartTagService } from '../../services/smart-tag.service';

@Component({
  selector: 'app-onboarding-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './onboarding-overlay.component.html',
  styleUrls: ['./onboarding-overlay.component.css']
})
export class OnboardingOverlayComponent {
  currentStep = signal<number>(0);
  
  steps = [
    {
      title: 'Step 1: Choose Your Learning Goal',
      description: 'Select what you want to do - Learn, Prepare for Test, Revise, or Clear a Doubt. Then type your topic.',
      highlight: 'intent-section'
    },
    {
      title: 'Step 2: Pick Smart Tags',
      description: 'Choose up to 5 helpful tags that match how you want to learn. Each tag customizes your prompt!',
      highlight: 'tags-section'
    },
    {
      title: 'Step 3: Generate & Copy',
      description: 'Click "Generate" to create your perfect AI prompt, then copy it and paste into ChatGPT!',
      highlight: 'prompt-section'
    }
  ];

  constructor(public tagService: SmartTagService) {}

  nextStep() {
    if (this.currentStep() < this.steps.length - 1) {
      this.currentStep.set(this.currentStep() + 1);
    } else {
      this.finish();
    }
  }

  previousStep() {
    if (this.currentStep() > 0) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  skip() {
    this.finish();
  }

  finish() {
    this.tagService.completeOnboarding();
  }
}
