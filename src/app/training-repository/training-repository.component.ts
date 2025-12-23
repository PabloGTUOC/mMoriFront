// src/app/training-repository/training-repository.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from "@angular/common";
import { TrainingRepositoryService } from '../services/training-repository.service';
import { TrainingItemComponent } from "../training-item/training-item.component";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";


@Component({
  selector: 'app-training-repository',
  standalone: true,
  templateUrl: './training-repository.component.html',
  styleUrls: ['./training-repository.component.scss'],
  imports: [CommonModule, TrainingItemComponent, ReactiveFormsModule]
})
export class TrainingRepositoryComponent implements OnInit {
  trainings: any[] = [];  // Store the list of trainings
  showAddTrainingForm = false;
  addTrainingForm!: FormGroup;

  constructor(private trainingRepositoryService: TrainingRepositoryService, private fb: FormBuilder) { }

  ngOnInit(): void {
    this.fetchTrainings();
    this.initializeForm();
  }

  // Fetch the training repository data from the service
  fetchTrainings() {
    this.trainingRepositoryService.getTrainingRepository().subscribe({
      next: (response) => {
        console.log('Fetched trainings:', response);
        if (Array.isArray(response)) {
          this.trainings = response;
        } else if (response.success && Array.isArray(response.data)) {
          this.trainings = response.data;
        } else if (response.success && Array.isArray(response.trainings)) {
          this.trainings = response.trainings;
        }
      },
      error: (error) => {
        console.error('Error fetching training repository:', error);
      }
    });
  }

  initializeForm() {
    this.addTrainingForm = this.fb.group({
      training_name: ['', Validators.required],
      type: ['', Validators.required],
      duration: ['', [Validators.required, Validators.min(1)]],
      calories: ['', [Validators.required, Validators.min(1)]],
      description: ['', Validators.required],
    });
  }

  toggleAddTrainingForm() {
    this.showAddTrainingForm = !this.showAddTrainingForm;
  }

  submitTraining() {
    if (this.showAddTrainingForm) {
      const newTrainingData = { training: this.addTrainingForm.value };
      // Log the data being submitted
      console.log('Submitting new training data:', newTrainingData);
      this.trainingRepositoryService.addNewTraining(newTrainingData).subscribe({
        next: (response) => {
          console.log('Response from server:', response);
          // Accept 200/201 responses or explicit success flag
          if (response || response.success) {
            this.showAddTrainingForm = false;
            this.addTrainingForm.reset();
            console.log('Training added successfully. Fetching updated training list...');
            this.fetchTrainings();
          }
        },
        error: (error) => {
          console.error('Error adding new training', error);
        }
      });
    }
  }
}
