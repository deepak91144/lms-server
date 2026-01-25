import mongoose, { Document, Schema } from 'mongoose';

export interface IRating extends Document {
  courseId: mongoose.Schema.Types.ObjectId;
  userId: string; // Clerk ID
  rating: number; // 1-5
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RatingSchema: Schema = new Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  userId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String }
}, { timestamps: true });

// Ensure a user can only rate a course once
RatingSchema.index({ courseId: 1, userId: 1 }, { unique: true });

export default mongoose.model<IRating>('Rating', RatingSchema);
