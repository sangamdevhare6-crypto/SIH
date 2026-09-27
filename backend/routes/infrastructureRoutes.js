const express = require('express');
const router = express.Router();
const infrastructureController = require('../controllers/infrastructureController');

router.get('/', infrastructureController.getAllInfrastructure);
router.get('/:id', infrastructureController.getInfrastructureById);

module.exports = router;
