import { Router } from 'express';
import {
  getSession,
  markAttendance,
  listAttendance,
  deleteAttendance,
  getSummary,
  exportSummary,
  getStudentAttendance,
} from '../controllers/attendanceController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/session', getSession);
router.get('/summary', getSummary);
router.get('/export', exportSummary);
router.get('/student/:studentId', getStudentAttendance);
router.get('/', listAttendance);
router.post('/', markAttendance);
router.delete('/:id', requireRole('admin'), deleteAttendance);

export default router;
