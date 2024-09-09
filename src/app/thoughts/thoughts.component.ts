import { Component } from '@angular/core';
import {CommonModule, TitleCasePipe} from "@angular/common";
import {ThoughtsService} from "../services/thoughts.service";
import {UserService} from "../services/user.service";
import {response} from "express";

@Component({
  selector: 'app-thoughts',
  standalone: true,
  templateUrl: './thoughts.component.html',
  imports: [
    TitleCasePipe,
    CommonModule
  ],
  styleUrls: ['./thoughts.component.scss']
})
export class ThoughtsComponent {
  selectedMood: string | null = null;
  recommendation: string | null = null;


  moods = [
    { label: 'Optimistic & Social', emoji: '😄', mood: 'optimistic' },
    { label: 'Angry & Moody', emoji: '😡', mood: 'angry' },
    { label: 'Calm & Analytic', emoji: '🤔', mood: 'calm' },
    { label: 'Relax & Pacific', emoji: '🧘‍♂️', mood: 'relaxed' },
  ];

  constructor(
    private thoughtsService: ThoughtsService,
    private userService: UserService
  ) {}

  selectMood(mood: string) {
    this.selectedMood = mood;
    this.saveMood();
    this.requestRecommendation();
  }

  saveMood() {
    const userId = this.userService.getUserId();
    const currentDate = new Date().toISOString().split('T')[0]; // Get the current date

    if (this.selectedMood && userId) {
      const moodData = {
        mood_data: {
          user_id: userId,
          mood: this.selectedMood,
          date: currentDate
        }
      };
      this.thoughtsService.saveMood(moodData)
        .subscribe({
          next: (response) => {
            console.log('Mood saved successfully', response);
          },
          error: (error) => {
            console.error('Error saving mood', error);
          }
        });
    } else {
      console.error('User ID is missing or mood not selected');
    }
  }

  requestRecommendation() {
    const userId = this.userService.getUserId();
    const currentDate = new Date().toISOString().split('T')[0]; // Get the current date

    if (this.selectedMood && userId) {
      const moodData = {
        mood_data: {
          user_id: userId,
          mood: this.selectedMood,
          date: currentDate
        }
      };
      this.thoughtsService.getRecomendation(moodData)
        .subscribe({
          next: (response) => {
            console.log('Recommendation successfully', response);
            if (response.success) {
              this.recommendation =this.formatRecommendation(response.recommendation);
            }
          },
          error: (error) => {
            console.error('Error with recommending', error);
          }
        });
    } else {
      console.error('User ID is missing or mood not selected');
    }
  }

  formatRecommendation(recommendation: string): string {
    return recommendation
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
      .replace(/\n\n/g, '<br><br>') // Paragraph breaks
      .replace(/^\d+\.\s(.*?)(?=\n|$)/gm, '<li>$1</li>') // Convert numbered points to list items
      .replace(/<li>/g, '<ul><li>') // Wrap in <ul> tag
      .replace(/<\/li>(?!<li>)/g, '</li></ul>'); // Close </ul> tag
  }

}
