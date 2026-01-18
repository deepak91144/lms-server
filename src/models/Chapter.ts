import mongoose, { Document, Schema } from 'mongoose';

export interface IChapter extends Document {
  sectionId: mongoose.Schema.Types.ObjectId;
  courseId: mongoose.Schema.Types.ObjectId;
  title: string;
  type: 'video' | 'text' | 'quiz';
  content: string; // URL for video, markdown for text
  questions: {
    question: string;
    options: string[];
    correctAnswer: number;
  }[];
  isFree: boolean;
  order: number;
}

const ChapterSchema: Schema = new Schema({
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['video', 'text', 'quiz', 'pdf'], 
    default: 'text' 
  },
  content: { type: String, default: '' },
  questions: [{
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: Number, required: true }
  }],
  isFree: { type: Boolean, default: false },
  order: { type: Number, required: true, default: 0 }
}, { timestamps: true });

export default mongoose.model<IChapter>('Chapter', ChapterSchema);
