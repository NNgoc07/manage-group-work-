const express = require('express');
const { createTask, getTasksByGroup, updateTaskStatus, deleteTask } = require('../controllers/taskController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware, createTask);
router.get('/group/:groupId', authMiddleware, getTasksByGroup);
router.put('/:id/status', authMiddleware, updateTaskStatus);
router.delete('/:id', authMiddleware, deleteTask);

module.exports = router;
