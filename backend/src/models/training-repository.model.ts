import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * `TrainingRepository` — collection `training_repository` (BACKEND_SPEC §3.5).
 *
 * A **global catalogue** of training templates, not scoped to a user. No validations.
 *
 * `type` as a path name: the spec (§3.5) flags this as reserved-ish and asks a
 * reimplementation to verify it on a different ORM. In Mongoose, `type: { type: String }`
 * is the documented escape hatch — the inner object is read as a type declaration, so the
 * path is a plain String and no discriminator behaviour is triggered. Verified by test.
 */

const trainingRepositorySchema = new Schema(
  {
    name: { type: String },
    type: { type: String },
    duration: { type: Number },
    calories: { type: Number },
    description: { type: String },
    /**
     * The verified uid of whoever added this entry (4.3.3). The catalogue is global — one
     * user's row is shown to everyone — so a bad entry needs to be traceable. Deliberately
     * **not serialised**: recording provenance is for whoever operates the service, and
     * broadcasting other users' uids to every client would be a small privacy leak of its
     * own. Undefined for rows written before this existed, or while AUTH_MODE is optional.
     */
    created_by: { type: String },
  },
  {
    collection: 'training_repository',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

export type TrainingRepositoryDoc = InferSchemaType<typeof trainingRepositorySchema>;
export const TrainingRepository = model('TrainingRepository', trainingRepositorySchema);
