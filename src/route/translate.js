const { Router } = require('express');
const languageController = require('../controllers/languageController');

const router = Router();

router.get('/translate', languageController.translate_get);


module.exports = router;
