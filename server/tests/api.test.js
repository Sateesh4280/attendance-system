import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-attendance-api';

let mongod;
let app;
let adminToken;
let teacherToken;
let classId;
let subjectId;
let studentId;

before(async () => {
  mongod = await MongoMemoryServer.create();
  const { connectDB } = await import('../src/config/db.js');
  await connectDB(mongod.getUri('attendance_test'));
  app = (await import('../src/app.js')).default;
});

after(async () => {
  const { disconnectDB } = await import('../src/config/db.js');
  await disconnectDB();
  await mongod?.stop();
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('Student Attendance API', () => {
  it('exposes a health endpoint', async () => {
    const res = await request(app).get('/api/health').expect(200);
    assert.equal(res.body.status, 'ok');
  });

  it('bootstraps the first admin and rejects a second public registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Admin User', email: 'admin@test.com', password: 'Secret123' })
      .expect(201);

    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.role, 'admin');

    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Second Admin', email: 'second@test.com', password: 'Secret123' })
      .expect(403);
  });

  it('logs in with valid credentials and rejects invalid ones', async () => {
    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrong-password' })
      .expect(401);
    assert.equal(bad.body.success, false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Secret123' })
      .expect(200);

    adminToken = res.body.data.token;
    assert.equal(res.body.data.user.email, 'admin@test.com');
  });

  it('creates a teacher, class, subject and student', async () => {
    await request(app)
      .post('/api/users')
      .set(auth(adminToken))
      .send({ name: 'Teacher One', email: 'teacher@test.com', password: 'Secret123', role: 'teacher' })
      .expect(201);

    const teacherLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'teacher@test.com', password: 'Secret123' })
      .expect(200);
    teacherToken = teacherLogin.body.data.token;

    const klass = await request(app)
      .post('/api/classes')
      .set(auth(adminToken))
      .send({ name: 'BCA - 1st Semester', code: 'BCA-1A', section: 'A' })
      .expect(201);
    classId = klass.body.data._id;

    const subject = await request(app)
      .post('/api/subjects')
      .set(auth(adminToken))
      .send({ name: 'Programming Fundamentals', code: 'BCA101', class: classId })
      .expect(201);
    subjectId = subject.body.data._id;

    const student = await request(app)
      .post('/api/students')
      .set(auth(adminToken))
      .send({ name: 'Test Student', rollNo: 'BCA1001', class: classId, email: 'student@test.com' })
      .expect(201);
    studentId = student.body.data._id;
  });

  it('blocks teachers from creating students', async () => {
    await request(app)
      .post('/api/students')
      .set(auth(teacherToken))
      .send({ name: 'Nope', rollNo: 'NOPE1', class: classId })
      .expect(403);
  });

  it('saves an attendance sheet and returns the session roster', async () => {
    const today = new Date().toISOString().slice(0, 10);

    await request(app)
      .post('/api/attendance')
      .set(auth(teacherToken))
      .send({
        class: classId,
        subject: subjectId,
        date: today,
        records: [{ student: studentId, status: 'present' }],
      })
      .expect(200);

    const session = await request(app)
      .get(`/api/attendance/session?class=${classId}&subject=${subjectId}&date=${today}`)
      .set(auth(teacherToken))
      .expect(200);

    assert.equal(session.body.data.students.length, 1);
    assert.equal(session.body.data.attendance.records[0].status, 'present');
  });

  it('rejects an attendance record for a student outside the class', async () => {
    const otherClass = await request(app)
      .post('/api/classes')
      .set(auth(adminToken))
      .send({ name: 'BBA - 1st Semester', code: 'BBA-1A', section: 'A' })
      .expect(201);

    const res = await request(app)
      .post('/api/attendance')
      .set(auth(adminToken))
      .send({
        class: otherClass.body.data._id,
        subject: subjectId,
        date: new Date().toISOString().slice(0, 10),
        records: [{ student: studentId, status: 'present' }],
      })
      .expect(400);

    assert.match(res.body.message, /does not belong|not active/i);
  });

  it('returns per-student summary and exports CSV', async () => {
    const summary = await request(app)
      .get(`/api/attendance/summary?class=${classId}`)
      .set(auth(teacherToken))
      .expect(200);

    assert.equal(summary.body.data.length, 1);
    assert.equal(summary.body.data[0].percentage, 100);
    assert.equal(summary.body.meta.sessions, 1);

    const csv = await request(app)
      .get(`/api/attendance/export?class=${classId}`)
      .set(auth(teacherToken))
      .expect(200);

    assert.match(csv.headers['content-type'], /text\/csv/);
    assert.match(csv.text, /Test Student/);
  });

  it('protects endpoints without a token', async () => {
    await request(app).get('/api/students').expect(401);
    await request(app).get('/api/dashboard').expect(401);
  });
});
