import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

declare global {
  namespace Express {
    interface Request {
      auth: {
        userId: string | null;
        sessionId: string | null;
        getToken: () => Promise<string | null>;
        claims: any;
      };
    }
  }
}


const app = express();
const PORT = 8000; // Changed from 5000 to avoid AirPlay conflict

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000', 
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean); // Remove undefined if env var is missing

    if (!origin) return callback(null, true); // Allow mobile apps/curl requests

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow Vercel deployments
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Default: block
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Connect to Database
// Connect to Database
import connectDB from './db';
import userRoutes from './routes/userRoutes';
import invitationRoutes from './routes/invitationRoutes';
import courseRoutes from './routes/courseRoutes';

connectDB();

app.use('/api/users', userRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/courses', courseRoutes);

app.get('/api/debug-users', async (req, res) => {
  const users = await import('./models/User').then(m => m.default.find({}));
  res.json(users);
});

app.get('/', (req, res) => {
  res.json({ message: 'LLM LMS Platform API is running 🚀', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
