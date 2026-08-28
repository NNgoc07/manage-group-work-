const express = require('express');
const { createComment, getCommentsByTask } = require('../controllers/commentController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware, createComment);
router.get('/task/:taskId', authMiddleware, getCommentsByTask);

module.exports = router;
