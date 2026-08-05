import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * `Mood` — collection `moods` (BACKEND_SPEC §3.4).
 *
 * No model-level validations: presence of `user_id`, `mood` and `date` is checked in the
 * controller instead, which is what produces the 400 "Missing parameters" branch.
 */

const moodSchema = new Schema(
  {
    user_id: { type: String },
    mood: { type: String },
    date: { type: Date },
  },
  {
    collection: 'moods',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

moodSchema.index({ user_id: 1, date: -1 }, { background: true });

export type MoodDoc = InferSchemaType<typeof moodSchema>;
export const Mood = model('Mood', moodSchema);
