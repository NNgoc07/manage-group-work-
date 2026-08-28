const express = require('express');
const authRoutes = require('./authRoutes');
const groupRoutes = require('./groupRoutes');
const taskRoutes = require('./taskRoutes');
const commentRoutes = require('./commentRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/groups', groupRoutes);
router.use('/tasks', taskRoutes);
router.use('/comments', commentRoutes);

module.exports = router;
