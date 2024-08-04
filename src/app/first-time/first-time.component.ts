import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import { UserDataService} from "../user-data.service";
import { UserService} from "../user.service";
import {response} from "express";

@Component({
  selector: 'app-first-time',
  standalone: true,
  templateUrl: './first-time.component.html',
  styleUrls: ['./first-time.component.css'],
  imports: [
    ReactiveFormsModule
  ],
  providers: [UserDataService]
})

export class FirstTimeComponent implements OnInit {
  userForm!: FormGroup;
  userId!: string | null;

  constructor(private fb: FormBuilder, private userDataService: UserDataService, private userService: UserService ) {}

  ngOnInit(): void {
    this.userService.userId$.subscribe((id: string | null) => {
      this.userId = id;
      console.log('User ID in ngOnInit:', this.userId);
      if (this.userId) {
        this.initializeForm();
      }
    });
  }

  initializeForm(): void {
    this.userForm = this.fb.group({
      user_id: [this.userId, Validators.required],
      dob: ['', Validators.required],
      gender: ['', Validators.required],
      height: ['', Validators.required],
      weight: ['', Validators.required],
      trainingFrequency: ['', Validators.required],
      smoker: [false],
      drinker: [false]
    });
  }

    onSubmit(): void {
      if (this.userForm.valid) {
          this.userDataService.submitUserData(this.userForm.value).subscribe({
            next: (response) => {
              console.log('user data subbmited OK', response);
            },
            error: (error) => {
              console.error('Error submitting user data', error);
            }
          });
      }
    }
}
