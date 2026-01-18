import mongoose, { Document, Schema } from 'mongoose';

export interface IInvitation extends Document {
  email: string;
  role: 'instructor' | 'tenant_admin'; // Can extend to other roles
  tenantId: mongoose.Schema.Types.ObjectId;
  status: 'pending' | 'accepted' | 'expired';
  token: string;
  expiresAt: Date;
  invitedBy: mongoose.Schema.Types.ObjectId; // User who invited
}

const InvitationSchema: Schema = new Schema({
  email: { type: String, required: true },
  role: { type: String, enum: ['instructor', 'tenant_admin'], required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
  token: { type: String, required: true }, // Simple token for validation
  expiresAt: { type: Date, required: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Ensure unique invite per email per tenant
InvitationSchema.index({ email: 1, tenantId: 1 }, { unique: true });

export default mongoose.model<IInvitation>('Invitation', InvitationSchema);
