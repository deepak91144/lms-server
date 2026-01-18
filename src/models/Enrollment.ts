import mongoose, { Document, Schema } from 'mongoose';

export interface IEnrollment extends Document {
  userId: string; // Clerk ID
  courseId: mongoose.Schema.Types.ObjectId;
  tenantId?: mongoose.Schema.Types.ObjectId;
  enrolledAt: Date;
  completedAt?: Date;
  progress: number; // 0-100
}

const EnrollmentSchema: Schema = new Schema({
  userId: { type: String, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  completedAt: { type: Date },
  enrollmentStatus: { type: String, enum: ['active', 'completed', 'dropped'], default: 'active' },
  completedChapters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' }],
  quizAttempts: [{
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
    answers: { type: Map, of: Number }, // Map of question index -> selected option index
    score: Number,
    passed: Boolean,
    attemptedAt: { type: Date, default: Date.now }
  }],
  progress: { type: Number, default: 0 }
}, { timestamps: { createdAt: 'enrolledAt', updatedAt: true } });

// Correcting index to be compound unique to prevent duplicate enrollments
EnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export default mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);
