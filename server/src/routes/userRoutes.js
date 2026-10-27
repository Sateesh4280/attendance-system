import { Router } from 'express';
import {
  listUsers,
  listTeachers,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/teachers', listTeachers);
router.get('/', requireRole('admin'), listUsers);
router.post('/', requireRole('admin'), createUser);
router.put('/:id', requireRole('admin'), updateUser);
router.delete('/:id', requireRole('admin'), deleteUser);

export default router;
