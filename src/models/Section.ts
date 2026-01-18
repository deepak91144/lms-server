import mongoose, { Document, Schema } from 'mongoose';

export interface ISection extends Document {
  courseId: mongoose.Schema.Types.ObjectId;
  title: string;
  order: number;
}

const SectionSchema: Schema = new Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true },
  order: { type: Number, required: true, default: 0 }
}, { timestamps: true });

export default mongoose.model<ISection>('Section', SectionSchema);
