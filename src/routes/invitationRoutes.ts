import express from 'express';
import crypto from 'crypto';
import Invitation from '../models/Invitation';
import User from '../models/User';

const router = express.Router();

// POST /api/invitations
// Invite a user to a tenant
router.post('/', async (req, res) => {
  const { inviterClerkId, email, role } = req.body;

  if (!inviterClerkId || !email || !role) {
     res.status(400).json({ error: 'Missing required fields' });
     return;
  }

  try {
    const inviter = await User.findOne({ clerkId: inviterClerkId });
    if (!inviter || !inviter.tenantId) {
      res.status(403).json({ error: 'Not authorized or no tenant found' });
      return;
    }

    // Only tenant admins (clients) or super admins can invite
    // Assuming 'tenant_admin' is the client running the school
    if (inviter.role !== 'tenant_admin' && inviter.role !== 'super_admin') {
       res.status(403).json({ error: 'Insufficient permissions' });
       return;
    }

    // Check if pending invite exists
    const existingInvite = await Invitation.findOne({ 
        email, 
        tenantId: inviter.tenantId,
        status: 'pending'
    });
    
    if (existingInvite) {
        res.status(400).json({ error: 'Invitation already pending for this email' });
        return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const newInvitation = new Invitation({
      email,
      role,
      tenantId: inviter.tenantId,
      token,
      expiresAt,
      invitedBy: inviter._id
    });

    await newInvitation.save();

    // In a real app, send email here using Resend/SendGrid with the link
    // link = `http://localhost:3000/accept-invite?token=${token}`
    
    res.json({ message: 'Invitation created', invitation: newInvitation });
  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invitations/tenant/:clerkId
// List pending invitations for the tenant of the logged-in user
router.get('/tenant/:clerkId', async (req, res) => {
    const { clerkId } = req.params;
    
    try {
        const user = await User.findOne({ clerkId });
        if (!user || !user.tenantId) {
            res.status(404).json({ error: 'User or tenant not found' });
            return;
        }

        const invitations = await Invitation.find({ tenantId: user.tenantId }).sort({ createdAt: -1 });
        res.json(invitations);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
