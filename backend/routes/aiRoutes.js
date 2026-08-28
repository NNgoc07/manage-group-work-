const express = require('express');
const { breakdown } = require('../controllers/aiController');

const router = express.Router();

router.post('/breakdown', breakdown);

module.exports = router;
