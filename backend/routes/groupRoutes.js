const express = require('express');
const { createGroup, joinGroup, getMyGroups } = require('../controllers/groupController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware, createGroup);
router.post('/join', authMiddleware, joinGroup);
router.get('/', authMiddleware, getMyGroups);

module.exports = router;
