import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";


@Component({
  selector: 'app-input-daily',
  standalone: true,
  templateUrl: './input-daily.component.html',
  styleUrls: ['./input-daily.component.css'],
  imports: [
    ReactiveFormsModule
  ]
})
export class InputDailyComponent implements OnInit{
  dailyForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.dailyForm = this.fb.group({
      training: ['', Validators.required],
    });
  }

  submitData(): void {
    if (this.dailyForm.valid) {
      console.log('Selected training:', this.dailyForm.value.training);
      // Add your data handling logic here
    } else {
      console.log('Form is invalid');
    }
  }
}
