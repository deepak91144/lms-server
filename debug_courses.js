const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const CourseSchema = new mongoose.Schema({
  title: String,
  instructorId: String
}, { strict: false });

const Course = mongoose.model('Course', CourseSchema);

function log(msg) {
    fs.appendFileSync('debug_output.txt', msg + '\n');
}

async function checkCourses() {
    try {
        fs.writeFileSync('debug_output.txt', 'Starting debug...\n');
        const uri = process.env.MONGO_URI;
        if (!uri) {
            log("No MONGO_URI found");
            return;
        }
        log("Connecting to " + uri);
        await mongoose.connect(uri);
        log("Connected to DB");

        const courses = await Course.find({});
        log(`Found ${courses.length} courses:`);
        courses.forEach(c => {
            log(`- Title: ${c.title}, InstructorId: ${c.instructorId}`);
            log(JSON.stringify(c, null, 2));
        });

    } catch (e) {
        log("Error: " + e.toString());
    } finally {
        await mongoose.disconnect();
    }
}

checkCourses();
