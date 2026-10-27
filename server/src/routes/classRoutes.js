import { Router } from 'express';
import {
  listClasses,
  createClass,
  updateClass,
  deleteClass,
} from '../controllers/classController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', listClasses);
router.post('/', requireRole('admin'), createClass);
router.put('/:id', requireRole('admin'), updateClass);
router.delete('/:id', requireRole('admin'), deleteClass);

export default router;
