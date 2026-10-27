/**
 * Demo data seeder.
 *
 *   npm run seed          -> only runs when the database is empty
 *   npm run seed -- --force -> wipes existing data and re-seeds
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Class from './models/Class.js';
import Subject from './models/Subject.js';
import Student from './models/Student.js';
import Attendance from './models/Attendance.js';

const force = process.argv.includes('--force');

const FIRST_NAMES = [
  'Aarav', 'Isha', 'Vivaan', 'Ananya', 'Aditya', 'Diya', 'Arjun', 'Meera', 'Kabir', 'Riya',
  'Rohan', 'Saanvi', 'Dev', 'Kavya', 'Ayaan', 'Nisha', 'Karan', 'Priya', 'Rahul', 'Sneha',
  'Vikram', 'Pooja', 'Siddharth', 'Neha', 'Manav', 'Tara', 'Yash', 'Aditi', 'Nikhil', 'Shruti',
  'Om', 'Tanvi', 'Parth', 'Ira', 'Harsh', 'Mahi', 'Dhruv', 'Sara', 'Aryan', 'Kiara',
  'Lakshya', 'Mira', 'Veer', 'Anika', 'Reyansh', 'Trisha', 'Advik', 'Sanya',
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Verma', 'Iyer', 'Mehta', 'Nair', 'Gupta', 'Reddy', 'Kulkarni', 'Joshi',
  'Desai', 'Chopra', 'Bose', 'Menon', 'Rao', 'Kapoor',
];

const CLASS_DEFS = [
  { name: 'BCA - 3rd Semester', code: 'BCA-3A', section: 'A', room: 'Lab 201', academicYear: '2025-2026' },
  { name: 'BCA - 3rd Semester', code: 'BCA-3B', section: 'B', room: 'Lab 202', academicYear: '2025-2026' },
  { name: 'BBA - 2nd Semester', code: 'BBA-2A', section: 'A', room: 'Room 105', academicYear: '2025-2026' },
  { name: 'B.Sc Computer Science - 1st Semester', code: 'BSC-1A', section: 'A', room: 'Room 301', academicYear: '2025-2026' },
];

const SUBJECT_DEFS = {
  'BCA-3A': [
    ['Data Structures', 'BCA301', 4],
    ['Operating Systems', 'BCA302', 4],
    ['Database Management', 'BCA303', 3],
    ['Web Technologies', 'BCA304', 3],
  ],
  'BCA-3B': [
    ['Data Structures', 'BCA301', 4],
    ['Operating Systems', 'BCA302', 4],
    ['Database Management', 'BCA303', 3],
    ['Web Technologies', 'BCA304', 3],
  ],
  'BBA-2A': [
    ['Financial Accounting', 'BBA201', 4],
    ['Business Communication', 'BBA202', 3],
    ['Marketing Management', 'BBA203', 3],
    ['Business Statistics', 'BBA204', 4],
  ],
  'BSC-1A': [
    ['Programming in C', 'BSC101', 4],
    ['Mathematics I', 'BSC102', 4],
    ['Digital Electronics', 'BSC103', 3],
    ['Computer Fundamentals', 'BSC104', 3],
  ],
};

/** Small deterministic RNG so repeated seeds look consistent. */
function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20260214);

function pickStatus(absentBoost = 0) {
  const roll = random();
  if (roll < 0.055 + absentBoost) return 'absent';
  if (roll < 0.095 + absentBoost) return 'late';
  if (roll < 0.115 + absentBoost) return 'excused';
  return 'present';
}

async function seed() {
  await connectDB();

  const existingUsers = await User.countDocuments();
  if (existingUsers > 0 && !force) {
    console.log('[seed] Database already has data. Re-run with "npm run seed -- --force" to reset.');
    await mongoose.disconnect();
    return;
  }

  if (force) {
    console.log('[seed] Clearing collections...');
    await Promise.all([
      User.deleteMany({}),
      Class.deleteMany({}),
      Subject.deleteMany({}),
      Student.deleteMany({}),
      Attendance.deleteMany({}),
    ]);
  }

  const admin = await User.create({
    name: 'Priya Deshmukh',
    email: 'admin@campus.edu',
    password: 'Admin@123',
    role: 'admin',
    phone: '+91 98765 43210',
  });

  const teacherDefs = [
    ['Dr. Rajesh Kulkarni', 'rajesh@campus.edu'],
    ['Prof. Anita Nair', 'anita@campus.edu'],
    ['Prof. Sameer Joshi', 'sameer@campus.edu'],
  ];

  const teachers = await User.create(
    teacherDefs.map(([name, email], index) => ({
      name,
      email,
      password: 'Teacher@123',
      role: 'teacher',
      phone: `+91 90000 0000${index + 1}`,
    })),
  );

  const classes = await Class.create(
    CLASS_DEFS.map((definition, index) => ({
      ...definition,
      teacher: teachers[index % teachers.length]._id,
    })),
  );

  const subjects = [];
  for (const klass of classes) {
    const defs = SUBJECT_DEFS[klass.code] || [];
    for (const [name, code, creditHours] of defs) {
      subjects.push({
        name,
        code,
        creditHours,
        class: klass._id,
        teacher: klass.teacher,
      });
    }
  }
  const createdSubjects = await Subject.create(subjects);

  const students = [];
  let nameIndex = 0;
  for (const [classIndex, klass] of classes.entries()) {
    for (let i = 0; i < 12; i += 1) {
      const first = FIRST_NAMES[nameIndex % FIRST_NAMES.length];
      const last = LAST_NAMES[(nameIndex * 3 + classIndex) % LAST_NAMES.length];
      const sequence = String(i + 1).padStart(3, '0');
      const rollNo = `${klass.code.replace(/-/g, '')}${sequence}`;
      students.push({
        name: `${first} ${last}`,
        rollNo,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${nameIndex}@student.campus.edu`,
        phone: `+91 98${String(10000000 + nameIndex * 137).slice(0, 8)}`,
        class: klass._id,
        guardianName: `${LAST_NAMES[(nameIndex + 5) % LAST_NAMES.length]} ${first[0]}.`,
        guardianPhone: `+91 97${String(20000000 + nameIndex * 211).slice(0, 8)}`,
        status: 'active',
      });
      nameIndex += 1;
    }
  }
  const createdStudents = await Student.create(students);

  const studentsByClass = new Map();
  for (const student of createdStudents) {
    const key = String(student.class);
    if (!studentsByClass.has(key)) studentsByClass.set(key, []);
    studentsByClass.get(key).push(student);
  }

  const sheets = [];
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  for (let dayOffset = 44; dayOffset >= 0; dayOffset -= 1) {
    const date = new Date(start.getTime() - dayOffset * 86400000);
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;

    for (const [classIndex, klass] of classes.entries()) {
      const classSubjects = createdSubjects.filter((subject) => String(subject.class) === String(klass._id));
      if (classSubjects.length === 0) continue;

      const sessionCount = 2;
      for (let s = 0; s < sessionCount; s += 1) {
        const subject = classSubjects[(dayOffset + classIndex + s) % classSubjects.length];
        const roster = studentsByClass.get(String(klass._id)) || [];

        const records = roster.map((student, studentIndex) => {
          // The first two students of each class are intentionally below 75%.
          const lowAttendance = studentIndex < 2;
          return {
            student: student._id,
            status: pickStatus(lowAttendance ? 0.35 : 0),
            remark: '',
          };
        });

        sheets.push({
          class: klass._id,
          subject: subject._id,
          date,
          records,
          markedBy: klass.teacher,
        });
      }
    }
  }

  await Attendance.insertMany(sheets);
  await Attendance.syncIndexes();

  console.log('\n[seed] Demo data created successfully');
  console.log(`  Admin      : admin@campus.edu / Admin@123`);
  console.log(`  Teacher    : rajesh@campus.edu / Teacher@123`);
  console.log(`  Classes    : ${classes.length}`);
  console.log(`  Subjects   : ${createdSubjects.length}`);
  console.log(`  Students   : ${createdStudents.length}`);
  console.log(`  Attendance : ${sheets.length} sessions\n`);

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error('[seed] failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
