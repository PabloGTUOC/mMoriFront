import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { UserService } from "../services/user.service";
import { UserDataService } from "../services/user-data.service";
import { forkJoin } from "rxjs";
import { TrainingRepositoryService } from "../services/training-repository.service";
import { CommonModule } from '@angular/common';
import { TrainingRepositoryEntry } from '../models';


@Component({
  selector: 'app-input-daily',
  standalone: true,
  templateUrl: './input-daily.component.html',
  styleUrls: ['./input-daily.component.css'],
  imports: [
    ReactiveFormsModule,
    CommonModule
  ]
})
export class InputDailyComponent implements OnInit {
  dailyForm!: FormGroup;
  userId!: string | null;
  trainings: TrainingRepositoryEntry[] = [];

  constructor(private fb: FormBuilder,
    private userDataService: UserDataService,
    private userService: UserService,
    private trainingRepositoryService: TrainingRepositoryService) { }

  ngOnInit(): void {
    this.userService.userId$.subscribe(userId => {
      this.userId = userId;
    });
    this.initializeForm();
    this.fetchTrainings();
  }

  initializeForm(): void {
    this.dailyForm = this.fb.group({
      training: ['', Validators.required],
      weight: ['', Validators.required]
    });
  }

  fetchTrainings(): void {
    this.trainingRepositoryService.getTrainingRepository().subscribe({
      next: (trainings) => (this.trainings = trainings),
      error: (error) => {
        console.error('Error fetching trainings', error);
      }
    });
  }

  submitData(): void {
    if (this.dailyForm.valid && this.userId) {
      const formData = this.dailyForm.value;
      const today = new Date().toISOString().split('T')[0];
      // Canonical backend field names. This used to send `date` and `training`, which the
      // API does not permit, so the row saved with nulls and the session's type was lost.
      const training_data = {
        user_id: this.userId,
        training_date: today,
        training_type: formData.training,
      };
      const weight_data = {
        user_id: this.userId,
        date: today,
        weight: Number(formData.weight),
      };
      forkJoin([
        this.userDataService.submitTrainingData(training_data),
        this.userDataService.submitWeightUpdate(weight_data)
      ]).subscribe({
        next: () => this.userService.triggerRefresh(),
        error: (error) => console.error('Error submitting data', error),
      });
    } else {
      console.warn('Form is invalid or the user is not signed in');
    }
  }

  /** Keeps DOM nodes stable across refetches instead of rebuilding the whole list. */
  trackById(_index: number, item: { _id?: { $oid: string }; name?: string }): string {
    return item._id?.$oid ?? item.name ?? String(_index);
  }
}
