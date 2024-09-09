import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import { UserService} from "../services/user.service";
import { UserDataService} from "../services/user-data.service";
import {response} from "express";
import {forkJoin} from "rxjs";
import {TrainingRepositoryService} from "../services/training-repository.service";
import {CommonModule} from "@angular/common";


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
export class InputDailyComponent implements OnInit{
  dailyForm!: FormGroup;
  userId!: string | null;
  trainings: any [] = [];

  constructor(private fb: FormBuilder,
              private userDataService: UserDataService,
              private userService: UserService,
              private trainingRepositoryService: TrainingRepositoryService) {}

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
      next: (response) => {
        if (response.success) {
          this.trainings = response.trainings;
        }
      }, error: (error) => {
        console.error('Error fetching trainings', error);
      }
    });
  }

  submitData(): void {
    if (this.dailyForm.valid) {
      const formData = this.dailyForm.value;
      const training_data = {
        user_id: this.userId,
        date: new Date().toISOString().split('T')[0], // Current date
        training: formData.training,
      };
      const weight_data = {
        user_id: this.userId,
        date: new Date().toISOString().split('T')[0],
        weight: formData.weight
      };
      forkJoin([
        this.userDataService.submitTrainingData(training_data),
        this.userDataService.submitWeightUpdate(weight_data)
      ]).subscribe({
        next: ([trainingResponse, weightResponse]) => {
          console.log('Training data submitted ok', trainingResponse);
          console.log('Weight data submitted ok', weightResponse);
          this.userService.triggerRefresh();
        }, error: (error) => {
          console.log('Error submitting data', error);
        }
      });
    } else {
      console.log('Form is invalid');
    }
  }
}
