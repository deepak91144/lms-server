import express from 'express';
import Course from '../models/Course';

const router = express.Router();
import Section from '../models/Section';
import Chapter from '../models/Chapter';
import { Types } from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Enrollment from '../models/Enrollment';
import { requireAuth } from '../middleware/auth';

// POST /api/courses/:id/enroll
router.post('/:id/enroll', requireAuth, async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.auth.userId;

    // Check if course exists
    const course: any = await Course.findById(courseId);
    if (!course) {
        res.status(404).json({ error: 'Course not found' });
        return;
    }

    // Check if already enrolled
    // const courseId is string | string[] from req.params but in express defaults it is string
    // we assume it is string here
    const existingInterest = await Enrollment.findOne({ 
        userId, 
        courseId: new Types.ObjectId(courseId as string) as any 
    });
    if (existingInterest) {
        res.status(200).json(existingInterest); // Already enrolled, just return it
        return;
    }

    const newEnrollment = new Enrollment({
        userId,
        courseId,
        tenantId: course.tenantId
    });

    await newEnrollment.save();
    res.status(201).json(newEnrollment);

  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/courses/student/enrolled
// Get all courses the current student is enrolled in
router.get('/student/enrolled', requireAuth, async (req, res) => {
    try {
        const userId = req.auth.userId;
        const enrollments = await Enrollment.find({ userId }).populate('courseId');
        
        // Transform to return courses with progress
        const data = enrollments.map((e: any) => {
            return {
                ...e.courseId.toObject(),
                progress: e.progress,
                enrolledAt: e.enrolledAt
            };
        });

        res.json(data);
    } catch (error) {
        console.error('Fetch enrolled error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



// GET /api/courses/published
// Get all published courses (public endpoint for landing page)
router.get('/published', async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true }).sort({ createdAt: -1 });

    // Collect all instructor IDs
    const instructorIds = [...new Set(courses.map(c => c.instructorId))];

    // Fetch users for these IDs
    const instructors = await User.find({ clerkId: { $in: instructorIds } });
    const instructorMap = new Map();
    instructors.forEach(inst => {
        instructorMap.set(inst.clerkId, `${inst.firstName} ${inst.lastName || ''}`.trim());
    });

    const coursesWithInstructor = courses.map(course => ({
        ...course.toObject(),
        instructorName: instructorMap.get(course.instructorId) || 'Unknown Instructor'
    }));

    res.json(coursesWithInstructor);
  } catch (error) {
    console.error('Error fetching published courses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/courses/my-courses
// Get courses for a specific instructor
router.get('/my-courses', async (req, res) => {
  const { instructorId } = req.query;

  if (!instructorId) {
    res.status(400).json({ error: 'Missing instructorId' });
    return;
  }

  try {
    const courses = await Course.find({ instructorId }).sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Configure Multer
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    let uploadPath = 'uploads/videos';
    if (file.mimetype === 'application/pdf') {
        uploadPath = 'uploads/pdfs';
    } else if (file.mimetype.startsWith('image/')) {
        uploadPath = 'uploads/images';
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)){
        fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req: any, file: any, cb: any) => {
    // Unique filename: fieldname-timestamp-random.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// GET /api/courses/:id
// Get course details (basic + instructor)
import User from '../models/User';

router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
        res.status(404).json({ error: 'Course not found' });
        return;
    }

    // Fetch instructor details
    let instructorName = 'Unknown Instructor';
    if (course.instructorId) {
        const instructor = await User.findOne({ clerkId: course.instructorId });
        if (instructor && instructor.firstName) {
            instructorName = `${instructor.firstName} ${instructor.lastName || ''}`.trim();
        }
    }

    res.json({
        ...course.toObject(),
        instructorName
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// PUT /api/courses/:id
// Update course details
router.put('/:id', upload.single('thumbnail'), async (req: express.Request, res: express.Response) => {
    try {
        const { title, description, category, isPublished } = req.body;
        const course = await Course.findById(req.params.id);

        if (!course) {
            res.status(404).json({ error: 'Course not found' });
            return;
        }

        if (title) course.title = title;
        if (description) course.description = description;
        if (category) course.category = category;
        if (isPublished !== undefined) course.isPublished = isPublished === 'true' || isPublished === true;

        const multerReq = req as MulterRequest;
        if (multerReq.file) {
            course.image = `/uploads/images/${multerReq.file.filename}`;
        }

        await course.save();
        res.json(course);
    } catch (error) {
        console.error('Error updating course:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/courses
// Create a new course
router.post('/', upload.single('thumbnail'), async (req: express.Request, res: express.Response) => {
  const { title, description, category, instructorId, tenantId } = req.body;

  if (!title || !description || !instructorId) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    let imagePath = '';
    const multerReq = req as MulterRequest;
    if (multerReq.file) {
        imagePath = `/uploads/images/${multerReq.file.filename}`;
    }

    const newCourse = new Course({
      title,
      description,
      category,
      instructorId,
      tenantId,
      image: imagePath
    });
    
    await newCourse.save();
    res.status(201).json(newCourse);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/courses/:id/curriculum
// Get full curriculum
router.get('/:id/curriculum', async (req, res) => {
  try {
    const sections = await Section.find({ courseId: new Types.ObjectId(req.params.id) as any }).sort({ order: 1 });
    const sectionsWithChapters = await Promise.all(sections.map(async (section) => {
        const chapters = await Chapter.find({ sectionId: section._id as any }).sort({ order: 1 });
        
        // Sanitize chapters to remove correct answers from quizzes
        const sanitizedChapters = chapters.map(chapter => {
            const chapObj = chapter.toObject();
            if (chapObj.type === 'quiz' && chapObj.questions) {
                chapObj.questions = chapObj.questions.map((q: any) => {
                    const { correctAnswer, ...rest } = q;
                    return rest;
                });
            }
            return chapObj;
        });

        return {
            ...section.toObject(),
            chapters: sanitizedChapters
        };
    }));
    res.json(sectionsWithChapters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/courses/:id/sections
router.post('/:id/sections', async (req, res) => {
  try {
    const { title } = req.body;
    const count = await Section.countDocuments({ courseId: new Types.ObjectId(req.params.id) as any });
    const newSection = new Section({
        courseId: new Types.ObjectId(req.params.id),
        title,
        order: count
    });
    await newSection.save();
    res.json(newSection);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/courses/:id/sections/:sectionId/chapters
router.post('/:id/sections/:sectionId/chapters', upload.single('file'), async (req: express.Request, res: express.Response) => {
    try {
      console.log('Received body:', req.body);
      const { title, type, content, isFree } = req.body;
      const count = await Chapter.countDocuments({ sectionId: new Types.ObjectId(req.params.sectionId as string) as any });
      
      let initialContent = content || '';
      const multerReq = req as MulterRequest;
      if (multerReq.file) {
          const folder = multerReq.file.mimetype === 'application/pdf' ? 'pdfs' : 'videos';
          initialContent = `/uploads/${folder}/${multerReq.file.filename}`;
      }

      let questions: any[] = [];
      if (req.body.questions) {
            try {
                console.log('Parsing questions:', req.body.questions);
                questions = typeof req.body.questions === 'string' 
                    ? JSON.parse(req.body.questions) 
                    : req.body.questions;
                console.log('Parsed questions:', questions);
            } catch (e) {
                console.error("Error parsing questions:", e);
                questions = [];
            }
      }

      const newChapter = new Chapter({
          courseId: new Types.ObjectId(req.params.id as string),
          sectionId: new Types.ObjectId(req.params.sectionId as string),
          title,
          type: type || 'text',
          content: initialContent,
          questions,
          isFree: isFree === 'true', // FormData sends string 'true'/'false'
          order: count
      });
      await newChapter.save();
      res.json(newChapter);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

// PUT /api/courses/:id/sections/:sectionId/chapters/:chapterId
// Update chapter content (including video/pdf upload)
interface MulterRequest extends express.Request {
    file?: any;
}

router.put('/:id/sections/:sectionId/chapters/:chapterId', upload.single('file'), async (req: express.Request, res: express.Response) => {
    try {
        const { title, type, content, isFree } = req.body;
        const chapterId = req.params.chapterId;
        
        const updateData: any = {};
        if (title) updateData.title = title;
        if (type) updateData.type = type;
        if (isFree !== undefined) updateData.isFree = isFree === 'true'; // FormData sends strings
        
        if (req.body.questions) {
            try {
                updateData.questions = typeof req.body.questions === 'string' 
                    ? JSON.parse(req.body.questions) 
                    : req.body.questions;
            } catch (e) {
                console.error("Error parsing questions:", e);
            }
        }
        
        // Handle Content update
        const multerReq = req as MulterRequest;
        if (multerReq.file) {
            // Include folder in path
            const folder = multerReq.file.mimetype === 'application/pdf' ? 'pdfs' : 'videos';
            updateData.content = `/uploads/${folder}/${multerReq.file.filename}`;
        } else if (content !== undefined) {
             // If manual content (text / ext URL) provided
            updateData.content = content;
        }

        const updatedChapter = await Chapter.findByIdAndUpdate(
            chapterId, 
            updateData, 
            { new: true }
        );

        if (!updatedChapter) {
            res.status(404).json({ error: 'Chapter not found' });
            return;
        }

        res.json(updatedChapter);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/courses/:id/sections/:sectionId/chapters/:chapterId
router.delete('/:id/sections/:sectionId/chapters/:chapterId', async (req, res) => {
    try {
        const { chapterId } = req.params;
        const deletedChapter = await Chapter.findByIdAndDelete(chapterId);
        
        if (!deletedChapter) {
            res.status(404).json({ error: 'Chapter not found' });
            return;
        }

        res.json({ message: 'Chapter deleted successfully' });
    } catch (error) {
        console.error('Error deleting chapter:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/courses/:id/publish
// Toggle course publication status
router.put('/:id/publish', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Toggle the isPublished status
    course.isPublished = !course.isPublished;
    await course.save();

    res.json(course);
  } catch (error) {
    console.error('Error toggling course publication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// GET /api/courses/:id/progress
router.get('/:id/progress', requireAuth, async (req, res) => {
    try {
        const courseId = req.params.id;
        const userId = req.auth.userId;

        const enrollment: any = await Enrollment.findOne({ userId, courseId: new Types.ObjectId(courseId as string) as any });
        if (!enrollment) {
            res.status(404).json({ error: 'Enrollment not found' });
            return;
        }

        res.json({
            progress: enrollment.progress,
            completedChapters: enrollment.completedChapters || []
        });
    } catch (err) {
        console.error("Error fetching progress:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/courses/:id/chapters/:chapterId/complete
router.post('/:id/chapters/:chapterId/complete', requireAuth, async (req, res) => {
    try {
        const { id: courseId, chapterId } = req.params;
        const userId = req.auth.userId;

        const enrollment: any = await Enrollment.findOne({ userId, courseId: new Types.ObjectId(courseId as string) as any });
        if (!enrollment) {
            res.status(404).json({ error: 'Enrollment not found' });
            return;
        }

        // Add chapter to completed list if not already present
        const chapObjectId = new Types.ObjectId(chapterId as string);
        const alreadyCompleted = enrollment.completedChapters.some((c: any) => c.toString() === chapObjectId.toString());
        
        if (!alreadyCompleted) {
            enrollment.completedChapters.push(chapObjectId);
            
            // Recalculate progress
            const sections = await Section.find({ courseId: new Types.ObjectId(courseId as string) as any });
            let totalChapters = 0;
            for (const section of sections) {
                totalChapters += await Chapter.countDocuments({ sectionId: section._id } as any);
            }

            if (totalChapters > 0) {
                enrollment.progress = Math.round((enrollment.completedChapters.length / totalChapters) * 100);
            }
            
            if (enrollment.progress === 100 && !enrollment.completedAt) {
                enrollment.completedAt = new Date();
            }

            await enrollment.save();
        }

        res.json({
            progress: enrollment.progress,
            completedChapters: enrollment.completedChapters
        });
    } catch (err) {
        console.error("Error completing chapter:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/courses/:id/chapters/:chapterId/quiz/submit
router.post('/:id/chapters/:chapterId/quiz/submit', requireAuth, async (req, res) => {
    try {
        console.log(`[Quiz Submit] Request received for chapter: ${req.params.chapterId}`);
        
        const { id: courseId, chapterId } = req.params;
        const userId = req.auth.userId;
        const answers = req.body.answers || {}; 

        console.log(`[Quiz Submit] User: ${userId}, Answers:`, answers);

        const chapter: any = await Chapter.findById(chapterId);
        if (!chapter || chapter.type !== 'quiz') {
            console.log('[Quiz Submit] Quiz not found or invalid type');
            res.status(404).json({ error: 'Quiz not found' });
            return;
        }

        if (!chapter.questions || !Array.isArray(chapter.questions)) {
            console.log('[Quiz Submit] No questions found in chapter');
            res.status(500).json({ error: 'Quiz has no questions configured' });
            return;
        }

        let correctCount = 0;
        const results = chapter.questions.map((q: any, index: number) => {
            const submittedAnswer = answers[index];
            const isCorrect = submittedAnswer === q.correctAnswer;
            if (isCorrect) correctCount++;
            return {
                questionIndex: index,
                isCorrect,
                correctAnswer: q.correctAnswer 
            };
        });

        console.log(`[Quiz Submit] Results calculated. Correct: ${correctCount}/${chapter.questions.length}`);

        const score = correctCount;
        const total = chapter.questions.length;
        const passed = total > 0 ? (score / total) >= 0.5 : false;

        // Save Attempt
        const enrollment: any = await Enrollment.findOne({ userId, courseId: new Types.ObjectId(courseId as string) as any });
        if (enrollment) {
             if (!enrollment.quizAttempts) enrollment.quizAttempts = [];
             
             // Remove previous attempt for this chapter if exists
             enrollment.quizAttempts = enrollment.quizAttempts.filter((a: any) => a.chapterId.toString() !== chapterId);
             
             // Add new attempt
             enrollment.quizAttempts.push({
                 chapterId: new Types.ObjectId(chapterId as string),
                 answers,
                 score,
                 passed,
                 attemptedAt: new Date()
             });

             // If passed, mark as complete
             if (passed) {
                 if (!enrollment.completedChapters) {
                     enrollment.completedChapters = [];
                 }
                 
                 const chapObjectId = new Types.ObjectId(chapterId as string);
                 const alreadyCompleted = enrollment.completedChapters.some((c: any) => c.toString() === chapObjectId.toString());
                 
                 if (!alreadyCompleted) {
                     enrollment.completedChapters.push(chapObjectId);
                     
                     // Recalculate progress
                     const sections = await Section.find({ courseId: new Types.ObjectId(courseId as string) as any });
                     let totalChapters = 0;
                     for (const section of sections) {
                         totalChapters += await Chapter.countDocuments({ sectionId: section._id } as any);
                     }
 
                     if (totalChapters > 0) {
                         enrollment.progress = Math.round((enrollment.completedChapters.length / totalChapters) * 100);
                     }
                     
                     if (enrollment.progress === 100 && !enrollment.completedAt) {
                         enrollment.completedAt = new Date();
                     }
                 }
             }
             
             // ALWAYS Save enrollment to store the attempt
             await enrollment.save();
             console.log('[Quiz Submit] Enrollment saved with attempt');
             
             // Return updated info
             res.json({
                 score,
                 total,
                 passed,
                 results,
                 progress: enrollment.progress,
                 completedChapters: enrollment.completedChapters,
                 isCourseCompleted: enrollment.progress === 100
             });
             return;

        } else {
             console.log('[Quiz Submit] Enrollment not found in DB');
             res.status(404).json({ error: 'Enrollment not found' });
             return;
        }

        res.json({
            score,
            total,
            passed,
            results
        });

    } catch (err) {
        console.error("[Quiz Submit] Error submitting quiz:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/courses/:id/chapters/:chapterId/quiz/attempt
router.get('/:id/chapters/:chapterId/quiz/attempt', requireAuth, async (req, res) => {
    try {
        const { id: courseId, chapterId } = req.params;
        const userId = req.auth.userId;

        const enrollment: any = await Enrollment.findOne({ userId, courseId: new Types.ObjectId(courseId as string) as any });
        
        if (!enrollment) {
            console.log(`[Quiz Attempt] No enrollment found for user ${userId} course ${courseId}`);
            res.json({ attempt: null });
            return;
        }

        if (!enrollment.quizAttempts || enrollment.quizAttempts.length === 0) {
            console.log(`[Quiz Attempt] No quiz attempts recorded for user`);
            res.json({ attempt: null });
            return;
        }

        const attempt = enrollment.quizAttempts.find((a: any) => a.chapterId.toString() === chapterId);
        if (!attempt) {
            console.log(`[Quiz Attempt] No attempt found for chapter ${chapterId}`);
            res.json({ attempt: null });
            return;
        }
        
        console.log(`[Quiz Attempt] Found attempt for chapter ${chapterId}. Score: ${attempt.score}`);

        // We need to reconstruct the results (feedback) because we don't store it explicitly, only answers
        const chapter: any = await Chapter.findById(chapterId);
        let results = [];
        if (chapter && chapter.questions) {
            results = chapter.questions.map((q: any, index: number) => {
                const submittedAnswer = attempt.answers.get(String(index));
                return {
                    questionIndex: index,
                    isCorrect: submittedAnswer === q.correctAnswer,
                    correctAnswer: q.correctAnswer 
                };
            });
        }

        res.json({
            attempt: {
                answers: attempt.answers,
                score: attempt.score,
                passed: attempt.passed,
                results
            }
        });

    } catch (err) {
        console.error("Error fetching quiz attempt:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
