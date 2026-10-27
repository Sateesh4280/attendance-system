import { Router } from 'express';
import {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
} from '../controllers/studentController.js';
import { getStudentAttendance } from '../controllers/attendanceController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', listStudents);
router.get('/:id/attendance', getStudentAttendance);
router.get('/:id', getStudent);
router.post('/', requireRole('admin'), createStudent);
router.put('/:id', requireRole('admin'), updateStudent);
router.delete('/:id', requireRole('admin'), deleteStudent);

export default router;
