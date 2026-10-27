import { Router } from 'express';
import {
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from '../controllers/subjectController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', listSubjects);
router.post('/', requireRole('admin'), createSubject);
router.put('/:id', requireRole('admin'), updateSubject);
router.delete('/:id', requireRole('admin'), deleteSubject);

export default router;
