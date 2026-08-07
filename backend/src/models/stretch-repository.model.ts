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
    /**
     * The verified uid of whoever added this entry (4.3.3). The catalogue is global — one
     * user's row is shown to everyone — so a bad entry needs to be traceable. Deliberately
     * **not serialised**: recording provenance is for whoever operates the service, and
     * broadcasting other users' uids to every client would be a small privacy leak of its
     * own. Undefined for rows written before this existed, or while AUTH_MODE is optional.
     */
    created_by: { type: String },
    /**
     * The author's display name, denormalised at write time.
     *
     * Catalogues are per-user and importable, so the discovery pool has to say whose entry
     * each one is. The uid cannot: it names an account rather than a person, and returning
     * it is the leak `created_by` is withheld to avoid. Denormalised because there is no
     * users collection to join against — identity lives in Firebase, not here.
     */
    created_by_name: { type: String },
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
