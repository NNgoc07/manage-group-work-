const express = require('express');
const { createGroup, joinGroup, getMyGroups, getGroupById, getGroupMembers } = require('../controllers/groupController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware, createGroup);
router.post('/join', authMiddleware, joinGroup);
router.get('/', authMiddleware, getMyGroups);
router.get('/:groupId/members', authMiddleware, getGroupMembers);
router.get('/:groupId', authMiddleware, getGroupById);

module.exports = router;
