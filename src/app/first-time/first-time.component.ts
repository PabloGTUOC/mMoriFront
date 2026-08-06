import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import { UserDataService} from "../services/user-data.service";
import { UserService} from "../services/user.service";
import { Router} from "@angular/router";
import { CommonModule } from '@angular/common';  // Import CommonModule here
import { UserDataPayload } from '../models';

@Component({
  selector: 'app-first-time',
  standalone: true,
  templateUrl: './first-time.component.html',
  styleUrls: ['./first-time.component.css'],
  imports: [
    ReactiveFormsModule,
    CommonModule
  ],
  providers: [UserDataService]
})

export class FirstTimeComponent implements OnInit {
  userForm!: FormGroup;
  userId!: string | null;
  countries = [
    { Country: 'Afghanistan', Country_Code: 'AFG' },
    { Country: 'Albania', Country_Code: 'ALB' },
    { Country: 'Algeria', Country_Code: 'DZA' },
    { Country: 'Angola', Country_Code: 'AGO' },
    { Country: 'Antigua and Barbuda', Country_Code: 'ATG' },
    { Country: 'Argentina', Country_Code: 'ARG' },
    { Country: 'Armenia', Country_Code: 'ARM' },
    { Country: 'Australia', Country_Code: 'AUS' },
    { Country: 'Austria', Country_Code: 'AUT' },
    { Country: 'Azerbaijan', Country_Code: 'AZE' },
    { Country: 'Bahamas', Country_Code: 'BHS' },
    { Country: 'Bahrain', Country_Code: 'BHR' },
    { Country: 'Bangladesh', Country_Code: 'BGD' },
    { Country: 'Barbados', Country_Code: 'BRB' },
    { Country: 'Belarus', Country_Code: 'BLR' },
    { Country: 'Belgium', Country_Code: 'BEL' },
    { Country: 'Belize', Country_Code: 'BLZ' },
    { Country: 'Benin', Country_Code: 'BEN' },
    { Country: 'Bhutan', Country_Code: 'BTN' },
    { Country: 'Bosnia and Herzegovina', Country_Code: 'BIH' },
    { Country: 'Botswana', Country_Code: 'BWA' },
    { Country: 'Brazil', Country_Code: 'BRA' },
    { Country: 'Brunei Darussalam', Country_Code: 'BRN' },
    { Country: 'Bulgaria', Country_Code: 'BGR' },
    { Country: 'Burkina Faso', Country_Code: 'BFA' },
    { Country: 'Burundi', Country_Code: 'BDI' },
    { Country: 'Cabo Verde', Country_Code: 'CPV' },
    { Country: 'Cambodia', Country_Code: 'KHM' },
    { Country: 'Cameroon', Country_Code: 'CMR' },
    { Country: 'Canada', Country_Code: 'CAN' },
    { Country: 'Central African Republic', Country_Code: 'CAF' },
    { Country: 'Chad', Country_Code: 'TCD' },
    { Country: 'Chile', Country_Code: 'CHL' },
    { Country: 'China', Country_Code: 'CHN' },
    { Country: 'Colombia', Country_Code: 'COL' },
    { Country: 'Comoros', Country_Code: 'COM' },
    { Country: 'Congo', Country_Code: 'COG' },
    { Country: 'Costa Rica', Country_Code: 'CRI' },
    { Country: 'Croatia', Country_Code: 'HRV' },
    { Country: 'Cuba', Country_Code: 'CUB' },
    { Country: 'Cyprus', Country_Code: 'CYP' },
    { Country: 'Czechia', Country_Code: 'CZE' },
    { Country: 'Denmark', Country_Code: 'DNK' },
    { Country: 'Djibouti', Country_Code: 'DJI' },
    { Country: 'Dominican Republic', Country_Code: 'DOM' },
    { Country: 'Ecuador', Country_Code: 'ECU' },
    { Country: 'Egypt', Country_Code: 'EGY' },
    { Country: 'El Salvador', Country_Code: 'SLV' },
    { Country: 'Equatorial Guinea', Country_Code: 'GNQ' },
    { Country: 'Eritrea', Country_Code: 'ERI' },
    { Country: 'Estonia', Country_Code: 'EST' },
    { Country: 'Eswatini', Country_Code: 'SWZ' },
    { Country: 'Ethiopia', Country_Code: 'ETH' },
    { Country: 'Fiji', Country_Code: 'FJI' },
    { Country: 'Finland', Country_Code: 'FIN' },
    { Country: 'France', Country_Code: 'FRA' },
    { Country: 'Gabon', Country_Code: 'GAB' },
    { Country: 'Gambia', Country_Code: 'GMB' },
    { Country: 'Georgia', Country_Code: 'GEO' },
    { Country: 'Germany', Country_Code: 'DEU' },
    { Country: 'Ghana', Country_Code: 'GHA' },
    { Country: 'Greece', Country_Code: 'GRC' },
    { Country: 'Grenada', Country_Code: 'GRD' },
    { Country: 'Guatemala', Country_Code: 'GTM' },
    { Country: 'Guinea', Country_Code: 'GIN' },
    { Country: 'Guinea-Bissau', Country_Code: 'GNB' },
    { Country: 'Guyana', Country_Code: 'GUY' },
    { Country: 'Haiti', Country_Code: 'HTI' },
    { Country: 'Honduras', Country_Code: 'HND' },
    { Country: 'Hungary', Country_Code: 'HUN' },
    { Country: 'Iceland', Country_Code: 'ISL' },
    { Country: 'India', Country_Code: 'IND' },
    { Country: 'Indonesia', Country_Code: 'IDN' },
    { Country: 'Iraq', Country_Code: 'IRQ' },
    { Country: 'Ireland', Country_Code: 'IRL' },
    { Country: 'Israel', Country_Code: 'ISR' },
    { Country: 'Italy', Country_Code: 'ITA' },
    { Country: 'Jamaica', Country_Code: 'JAM' },
    { Country: 'Japan', Country_Code: 'JPN' },
    { Country: 'Jordan', Country_Code: 'JOR' },
    { Country: 'Kazakhstan', Country_Code: 'KAZ' },
    { Country: 'Kenya', Country_Code: 'KEN' },
    { Country: 'Kiribati', Country_Code: 'KIR' },
    { Country: 'Kuwait', Country_Code: 'KWT' },
    { Country: 'Kyrgyzstan', Country_Code: 'KGZ' },
    { Country: 'Lao People\'s Democratic Republic', Country_Code: 'LAO' },
    { Country: 'Latvia', Country_Code: 'LVA' },
    { Country: 'Lebanon', Country_Code: 'LBN' },
    { Country: 'Lesotho', Country_Code: 'LSO' },
    { Country: 'Liberia', Country_Code: 'LBR' },
    { Country: 'Libya', Country_Code: 'LBY' },
    { Country: 'Lithuania', Country_Code: 'LTU' },
    { Country: 'Luxembourg', Country_Code: 'LUX' },
    { Country: 'Madagascar', Country_Code: 'MDG' },
    { Country: 'Malawi', Country_Code: 'MWI' },
    { Country: 'Malaysia', Country_Code: 'MYS' },
    { Country: 'Maldives', Country_Code: 'MDV' },
    { Country: 'Mali', Country_Code: 'MLI' },
    { Country: 'Malta', Country_Code: 'MLT' },
    { Country: 'Mauritania', Country_Code: 'MRT' },
    { Country: 'Mauritius', Country_Code: 'MUS' },
    { Country: 'Mexico', Country_Code: 'MEX' },
    { Country: 'Mongolia', Country_Code: 'MNG' },
    { Country: 'Montenegro', Country_Code: 'MNE' },
    { Country: 'Morocco', Country_Code: 'MAR' },
    { Country: 'Mozambique', Country_Code: 'MOZ' },
    { Country: 'Myanmar', Country_Code: 'MMR' },
    { Country: 'Namibia', Country_Code: 'NAM' },
    { Country: 'Nepal', Country_Code: 'NPL' },
    { Country: 'New Zealand', Country_Code: 'NZL' },
    { Country: 'Nicaragua', Country_Code: 'NIC' },
    { Country: 'Niger', Country_Code: 'NER' },
    { Country: 'Nigeria', Country_Code: 'NGA' },
    { Country: 'North Macedonia', Country_Code: 'MKD' },
    { Country: 'Norway', Country_Code: 'NOR' },
    { Country: 'Oman', Country_Code: 'OMN' },
    { Country: 'Pakistan', Country_Code: 'PAK' },
    { Country: 'Panama', Country_Code: 'PAN' },
    { Country: 'Papua New Guinea', Country_Code: 'PNG' },
    { Country: 'Paraguay', Country_Code: 'PRY' },
    { Country: 'Peru', Country_Code: 'PER' },
    { Country: 'Philippines', Country_Code: 'PHL' },
    { Country: 'Poland', Country_Code: 'POL' },
    { Country: 'Portugal', Country_Code: 'PRT' },
    { Country: 'Qatar', Country_Code: 'QAT' },
    { Country: 'Romania', Country_Code: 'ROU' },
    { Country: 'Russian Federation', Country_Code: 'RUS' },
    { Country: 'Rwanda', Country_Code: 'RWA' },
    { Country: 'Saint Lucia', Country_Code: 'LCA' },
    { Country: 'Saint Vincent and the Grenadines', Country_Code: 'VCT' },
    { Country: 'Samoa', Country_Code: 'WSM' },
    { Country: 'Sao Tome and Principe', Country_Code: 'STP' },
    { Country: 'Saudi Arabia', Country_Code: 'SAU' },
    { Country: 'Senegal', Country_Code: 'SEN' },
    { Country: 'Serbia', Country_Code: 'SRB' },
    { Country: 'Seychelles', Country_Code: 'SYC' },
    { Country: 'Sierra Leone', Country_Code: 'SLE' },
    { Country: 'Singapore', Country_Code: 'SGP' },
    { Country: 'Slovakia', Country_Code: 'SVK' },
    { Country: 'Slovenia', Country_Code: 'SVN' },
    { Country: 'Solomon Islands', Country_Code: 'SLB' },
    { Country: 'Somalia', Country_Code: 'SOM' },
    { Country: 'South Africa', Country_Code: 'ZAF' },
    { Country: 'South Sudan', Country_Code: 'SSD' },
    { Country: 'Spain', Country_Code: 'ESP' },
    { Country: 'Sri Lanka', Country_Code: 'LKA' },
    { Country: 'Sudan', Country_Code: 'SDN' },
    { Country: 'Suriname', Country_Code: 'SUR' },
    { Country: 'Sweden', Country_Code: 'SWE' },
    { Country: 'Switzerland', Country_Code: 'CHE' },
    { Country: 'Syrian Arab Republic', Country_Code: 'SYR' },
    { Country: 'Tajikistan', Country_Code: 'TJK' },
    { Country: 'Thailand', Country_Code: 'THA' },
    { Country: 'Timor-Leste', Country_Code: 'TLS' },
    { Country: 'Togo', Country_Code: 'TGO' },
    { Country: 'Tonga', Country_Code: 'TON' },
    { Country: 'Trinidad and Tobago', Country_Code: 'TTO' },
    { Country: 'Tunisia', Country_Code: 'TUN' },
    { Country: 'Turkmenistan', Country_Code: 'TKM' },
    { Country: 'Uganda', Country_Code: 'UGA' },
    { Country: 'Ukraine', Country_Code: 'UKR' },
    { Country: 'United Arab Emirates', Country_Code: 'ARE' },
    { Country: 'United Kingdom of Great Britain and Northern Ireland', Country_Code: 'GBR' },
    { Country: 'United States of America', Country_Code: 'USA' },
    { Country: 'Uruguay', Country_Code: 'URY' },
    { Country: 'Uzbekistan', Country_Code: 'UZB' },
    { Country: 'Vanuatu', Country_Code: 'VUT' },
    { Country: 'Viet Nam', Country_Code: 'VNM' },
    { Country: 'Yemen', Country_Code: 'YEM' },
    { Country: 'Zambia', Country_Code: 'ZMB' },
    { Country: 'Zimbabwe', Country_Code: 'ZWE' }
  ];


  constructor(private fb: FormBuilder, private userDataService: UserDataService, private userService: UserService, private router: Router ) {}

  ngOnInit(): void {
    this.userService.userId$.subscribe((id: string | null) => {
      this.userId = id;
      if (this.userId) {
        this.initializeForm();
      }
    });
  }

  initializeForm(): void {
    this.userForm = this.fb.group({
      dob: ['', Validators.required],
      gender: ['', Validators.required],
      height: ['', Validators.required],
      weight: ['', Validators.required],
      trainingFrequency: ['', Validators.required],
      smoker: [false],
      drinker: [false],
      country_code: ['', Validators.required]
    });
  }

    onSubmit(): void {
      if (this.userForm.valid) {
          const form = this.userForm.value;
          // The form's control names are its own; these are the backend's. Sending the
          // form value verbatim meant training_frequency, smoking_status, drinking_status
          // and country were all dropped, so signup failed its presence validations.
          const payload: UserDataPayload = {
            dob: form.dob,
            gender: form.gender,
            height: Number(form.height),
            weight: Number(form.weight),
            training_frequency: Number(form.trainingFrequency),
            smoking_status: !!form.smoker,
            drinking_status: !!form.drinker,
            country: form.country_code,
          };
          this.userDataService.submitUserData(payload).subscribe({
            next: () => {
              this.userService.setUserNewStatus(false);
              // Was '/main', which is not a route — onboarding dead-ended here.
              this.router.navigate(['/home']);
            },
            error: (error) => {
              console.error('Error submitting user data', error);
            }
          });
      }
    }

  /** The country list is static; track by its code rather than by index. */
  trackByCountryCode(_index: number, country: { Country_Code: string }): string {
    return country.Country_Code;
  }
}
