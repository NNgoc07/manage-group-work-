const express = require('express');
const { createGroup, joinGroup, getMyGroups, getGroupMembers, getGroupById, removeMember, updateMemberRole, updateGroup, deleteGroup } = require('../controllers/groupController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware, createGroup);
router.post('/join', authMiddleware, joinGroup);
router.get('/', authMiddleware, getMyGroups);
router.get('/:groupId/members', authMiddleware, getGroupMembers);
router.delete('/:groupId/members/:userId', authMiddleware, removeMember);
router.put('/:groupId/members/:userId/role', authMiddleware, updateMemberRole);
router.put('/:groupId', authMiddleware, updateGroup);
router.delete('/:groupId', authMiddleware, deleteGroup);
router.get('/:groupId', authMiddleware, getGroupById);

module.exports = router;
