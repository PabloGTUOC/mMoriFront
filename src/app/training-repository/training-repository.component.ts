// src/app/training-repository/training-repository.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from "@angular/common";
import { TrainingRepositoryService } from '../services/training-repository.service';
import { TrainingItemComponent } from "../training-item/training-item.component";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TrainingRepositoryEntry } from '../models';


@Component({
  selector: 'app-training-repository',
  standalone: true,
  templateUrl: './training-repository.component.html',
  styleUrls: ['./training-repository.component.scss'],
  imports: [CommonModule, TrainingItemComponent, ReactiveFormsModule]
})
export class TrainingRepositoryComponent implements OnInit {
  trainings: TrainingRepositoryEntry[] = [];
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
      // The service unwraps the envelope, so this is already a plain array. The old
      // three-branch shape guessing existed because the contract was unknown; it is not.
      next: (trainings) => (this.trainings = trainings),
      error: (error) => {
        console.error('Error fetching training repository:', error);
      }
    });
  }

  initializeForm() {
    this.addTrainingForm = this.fb.group({
      name: ['', Validators.required],
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
      this.trainingRepositoryService.addNewTraining(this.addTrainingForm.value).subscribe({
        next: () => {
          this.showAddTrainingForm = false;
          this.addTrainingForm.reset();
          this.fetchTrainings();
        },
        error: (error) => {
          console.error('Error adding new training', error);
        }
      });
    }
  }
}
