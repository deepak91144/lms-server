import mongoose, { Document, Schema } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  slug: string;
  domain?: string;
  status: 'active' | 'suspended';
  branding: {
    logo?: string;
    primaryColor?: string;
  };
  config: {
    maxStudents?: number;
    aiEnabled: boolean;
  };
  createdAt: Date;
}

const TenantSchema: Schema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  domain: { type: String, unique: true, sparse: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  branding: {
    logo: String,
    primaryColor: { type: String, default: '#000000' }
  },
  config: {
    maxStudents: { type: Number, default: 100 },
    aiEnabled: { type: Boolean, default: true }
  }
}, { timestamps: true });

export default mongoose.model<ITenant>('Tenant', TenantSchema);
