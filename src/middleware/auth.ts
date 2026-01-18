import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { Request, Response, NextFunction, RequestHandler } from 'express';

// Middleware to protect routes
// Note: You need CLERK_SECRET_KEY in .env for this to work
export const requireAuth = ClerkExpressRequireAuth({
  // options if needed
}) as unknown as RequestHandler;

