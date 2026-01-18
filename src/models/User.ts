import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  clerkId: string;
  role: 'super_admin' | 'tenant_admin' | 'instructor' | 'student' | 'pending';
  tenantId?: mongoose.Schema.Types.ObjectId; // Null for super_admin
  firstName?: string;
  lastName?: string;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  clerkId: { type: String, required: true, unique: true },
  role: { 
    type: String, 
    enum: ['super_admin', 'tenant_admin', 'instructor', 'student', 'pending'], 
    required: true 
  },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  firstName: String,
  lastName: String
}, { timestamps: true });

// Compound index to ensure email is unique per tenant? 
// Actually, email should be globally unique for Clerk usually.
// But mostly users are scoped to tenants.
// For now, let's keep global email uniqueness for simplicity with Clerk.

export default mongoose.model<IUser>('User', UserSchema);
