const express = require('express');

const task = require('../controllers/task');

const router = express.Router();

router.post('/task/localBatch/java', task.executeLocalBatch);

module.exports = router;
