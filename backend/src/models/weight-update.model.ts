import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * `WeightUpdate` — collection `weight_updates` (BACKEND_SPEC §3.3).
 *
 * Note: **no timestamps** on this model, unlike every other one. That is why
 * `fetch_latest_weight` orders by `date desc, _id desc` — the `_id` tiebreaker is the only
 * thing making same-day weigh-ins deterministic (latest insert wins).
 */

const weightUpdateSchema = new Schema(
  {
    user_id: { type: String, required: [true, "User can't be blank"] },
    weight: { type: Number, required: [true, "Weight can't be blank"] },
    date: { type: Date, required: [true, "Date can't be blank"] },
  },
  {
    collection: 'weight_updates',
    timestamps: false,
    versionKey: false,
  }
);

weightUpdateSchema.index({ user_id: 1, date: 1 }, { background: true });

export type WeightUpdateDoc = InferSchemaType<typeof weightUpdateSchema>;
export const WeightUpdate = model('WeightUpdate', weightUpdateSchema);
