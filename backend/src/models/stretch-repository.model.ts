import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * `StretchRepository` — collection `stretch_repository` (BACKEND_SPEC §3.6).
 *
 * Global catalogue of stretches; same shape as the training catalogue minus calories.
 *
 * `video_link` is an **addition to the spec**. The frontend's `StretchItemComponent`
 * embeds a YouTube player from `stretch.video_link`, and its add-stretch form requires a
 * URL, but the Rails model had no such field — so the link was silently dropped on write
 * and the iframe rendered empty. The field is additive: nothing in the spec's contract
 * changes, and documents without it still serialise cleanly.
 */

const stretchRepositorySchema = new Schema(
  {
    name: { type: String },
    type: { type: String },
    duration: { type: Number },
    description: { type: String },
    video_link: { type: String },
  },
  {
    collection: 'stretch_repository',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

export type StretchRepositoryDoc = InferSchemaType<typeof stretchRepositorySchema>;
export const StretchRepository = model('StretchRepository', stretchRepositorySchema);
