import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * `Training` — collection `trainings` (BACKEND_SPEC §3.2).
 *
 * `training_date` is deliberately a **String**, not a Date. That is a documented quirk of
 * the original model, and the read endpoints sort on it directly
 * (`order_by(training_date: :desc)`), which only behaves sanely for zero-padded
 * "YYYY-MM-DD" strings that sort lexicographically. Changing the type here would silently
 * change the ordering of existing data.
 *
 * The spec records **no validations** on this model, so a document with every field null
 * saves successfully. Preserved: the frontend's `InputDailyComponent` posts only
 * `user_id`, `date` and the selected training name, and relies on the write succeeding so
 * that `training-stats` counts the day.
 */

const trainingSchema = new Schema(
  {
    user_id: { type: String },
    training_date: { type: String },
    training_type: { type: String },
    duration: { type: Number },
    calories_burned: { type: Number },
    description: { type: String },
  },
  {
    collection: 'trainings',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

trainingSchema.index({ user_id: 1, training_date: 1 }, { background: true });

export type TrainingDoc = InferSchemaType<typeof trainingSchema>;
export const Training = model('Training', trainingSchema);
