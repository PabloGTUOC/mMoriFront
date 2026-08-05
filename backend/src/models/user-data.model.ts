import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * `UserData` — collection `user_data` (BACKEND_SPEC §3.1).
 *
 * Semantics that matter: this is an **append-only history**, not a single profile row.
 * Several documents may share a `user_id`. Reads take the newest (`created_at` desc)
 * everywhere except `training-stats`, which takes the oldest as the user's join date.
 *
 * All seven of the spec's presence validations are preserved. The spec's index was
 * `{ user_id: 1, date: 1 }` on a `date` field that does not exist on this model
 * (§3.1 quirk); the useful half is indexed here instead.
 */

const userDataSchema = new Schema(
  {
    user_id: { type: String, required: [true, "User can't be blank"] },
    dob: { type: Date, required: [true, "Dob can't be blank"] },
    gender: { type: String, required: [true, "Gender can't be blank"] },
    height: { type: Number, required: [true, "Height can't be blank"] },
    weight: { type: Number, required: [true, "Weight can't be blank"] },
    training_frequency: {
      type: Number,
      required: [true, "Training frequency can't be blank"],
    },
    smoking_status: { type: Boolean, default: false },
    drinking_status: { type: Boolean, default: false },
    country: { type: String, required: [true, "Country can't be blank"] },
  },
  {
    collection: 'user_data',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

userDataSchema.index({ user_id: 1, created_at: -1 }, { background: true });

export type UserDataDoc = InferSchemaType<typeof userDataSchema>;
export const UserData = model('UserData', userDataSchema);
