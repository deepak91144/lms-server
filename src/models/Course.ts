import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  description: string;
  category: string;
  instructorId: string; // Clerk ID
  tenantId?: mongoose.Schema.Types.ObjectId;
  image?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  instructorId: { type: String, required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  image: { type: String },
  isPublished: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model<ICourse>('Course', CourseSchema);
