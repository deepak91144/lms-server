import express from 'express';
import User from '../models/User';
import Tenant from '../models/Tenant';
import Invitation from '../models/Invitation';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

import fs from 'fs';
import path from 'path';

// POST /api/users/sync
// Called after login to ensure user exists in DB
router.post('/sync', requireAuth, async (req, res) => {
  // Use the verified userId from the token
  const clerkId = req.auth.userId;
  const { email, firstName, lastName, role: requestedRole } = req.body;
  
  const logFile = path.join(__dirname, '../../sync_debug.log');
  const log = (msg: string) => fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);

  log(`Sync Request for clerkId: ${clerkId}, email: ${email}, requestedRole: ${requestedRole}`);

  if (!clerkId || !email) {
    log('Missing required fields');
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    let user = await User.findOne({ clerkId });
    log(`Found user: ${user ? user._id : 'null'}`);

    if (!user) {
      log('Creating new user...');
      // Check for pending invitation
      const invitation = await Invitation.findOne({ email, status: 'pending' });
      log(`Invitation found: ${invitation ? invitation._id : 'none'}`);
      
      let role = 'pending';
      let tenantId = undefined;

      // Super Admin Override
      if (process.env.SUPER_ADMIN_EMAIL && email === process.env.SUPER_ADMIN_EMAIL) {
          role = 'super_admin';
      } else if (requestedRole === 'student') {
          role = 'student';
      } else if (invitation) {
          role = invitation.role;
          tenantId = invitation.tenantId;
          invitation.status = 'accepted';
          await invitation.save();
      }

      log(`Determined role: ${role}`);

      // Handle potential missing names (e.g. email/password sign-up might not provide them initially)
      const safeFirstName = firstName || '';
      const safeLastName = lastName || '';

      if (invitation && role !== 'super_admin') {
          // Auto-accept invitation
          user = new User({
              clerkId,
              email,
              firstName: safeFirstName,
              lastName: safeLastName,
              role: role as any, 
              tenantId
          });
      } else {
          // Default or Super Admin
          user = new User({
            clerkId,
            email,
            firstName: safeFirstName,
            lastName: safeLastName,
            role: role as any, 
          });
      }
      try {
        await user.save();
        log(`User saved: ${user._id}`);
      } catch (saveErr: any) {
         log(`Error saving user: ${saveErr.message}`);
         throw saveErr;
      }
    } else {
        // Optional: Update name if it changed/was added
        if (firstName && firstName !== user.firstName) user.firstName = firstName;
        if (lastName && lastName !== user.lastName) user.lastName = lastName;
        
        // If user is pending but requests student role (e.g. they came back via "Start Learning" button)
        if (user.role === 'pending' && requestedRole === 'student') {
             user.role = 'student';
             log(`Updated existing pending user to student`);
        }
        
        await user.save();
    }

    log(`Returning user: ${JSON.stringify(user)}`);
    res.json(user);
  } catch (error: any) {
    log(`Error syncing user: ${error.message}`);
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/onboard
// Called when user selects a role during onboarding
router.post('/onboard', requireAuth, async (req, res) => {
  // Verify user from token
  const clerkId = req.auth.userId;
  const { role, tenantName, tenantSlug } = req.body;

  if (!clerkId || !role) {
     res.status(400).json({ error: 'Missing required fields' });
     return;
  }

  try {
    const user = await User.findOne({ clerkId });
    if (!user) {
       res.status(404).json({ error: 'User not found' });
       return;
    }

    if (role === 'tenant_admin') {
      if (!tenantName || !tenantSlug) {
         res.status(400).json({ error: 'Tenant details required for admin role' });
         return;
      }

      // Create Tenant
      const newTenant = new Tenant({
        name: tenantName,
        slug: tenantSlug,
        // domain, branding etc can be set later
      });
      await newTenant.save();

      // Update User
      user.role = 'tenant_admin';
      user.tenantId = newTenant._id as any;
      await user.save();

      res.json({ user, tenant: newTenant });

    } else if (role === 'student' || role === 'instructor') {
        // Just update role (if changed) or confirm onboarding
        user.role = role;
        // Logic to join a tenant could go here, or be separate
        await user.save();
        res.json({ user });
    } else {
        res.status(400).json({ error: 'Invalid role' });
    }

  } catch (error) {
    console.error('Error onboarding user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
