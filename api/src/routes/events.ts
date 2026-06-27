import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as ctrl from '../controllers/eventController';

const router = Router();

router.use(requireAuth);

router.get('/', ctrl.list);
router.get('/search', ctrl.search);    // MUST come before /:id
router.get('/trash', ctrl.listTrash);  // MUST come before /:id
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);
router.post('/:id/restore', ctrl.restore);
router.delete('/:id', ctrl.remove);

export default router;
