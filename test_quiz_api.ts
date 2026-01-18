import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

async function testQuizCreation() {
  try {
    // 1. Get a course
    console.log('Fetching courses...');
    const coursesRes = await axios.get(`${API_URL}/courses/published`);
    const courses = coursesRes.data;
    
    if (courses.length === 0) {
      console.log('No published courses found. Trying to find any course via DB directly might be needed, but sticking to API.');
      return;
    }

    const course = courses[0];
    console.log(`Using course: ${course.title} (${course._id})`);

    // 2. Get curriculum to find a section
    const curriculumRes = await axios.get(`${API_URL}/courses/${course._id}/curriculum`);
    const sections = curriculumRes.data;

    let sectionId;
    if (sections.length === 0) {
      console.log('No sections found. Creating one...');
      const sectionRes = await axios.post(`${API_URL}/courses/${course._id}/sections`, {
        title: 'Debug Section'
      });
      sectionId = sectionRes.data._id;
    } else {
      sectionId = sections[0]._id;
    }
    console.log(`Using section: ${sectionId}`);

    // 3. Create Quiz Chapter
    console.log('Creating Quiz Chapter...');
    const formData = new FormData();
    formData.append('title', 'Debug Quiz Chapter');
    formData.append('type', 'quiz');
    
    const questions = [
      {
        question: 'What is 2+2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: 1
      },
      {
        question: 'What is the capital of France?',
        options: ['London', 'Berlin', 'Madrid', 'Paris'],
        correctAnswer: 3
      }
    ];
    
    formData.append('questions', JSON.stringify(questions));

    const createRes = await axios.post(
      `${API_URL}/courses/${course._id}/sections/${sectionId}/chapters`, 
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    console.log('Chapter created. Response:', JSON.stringify(createRes.data, null, 2));

    if (createRes.data.questions && createRes.data.questions.length === 2) {
      console.log('SUCCESS: Questions returned in response.');
    } else {
      console.log('FAILURE: Questions missing or incorrect in response.');
    }

  } catch (err: any) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

testQuizCreation();
