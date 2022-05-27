const { Router } = require('express');
const roomController = require('../controllers/roomController');

const router = Router();

router.post('/createRoom', roomController.createRoom_post);
router.get('/listRooms', roomController.listRoom_get);
router.post('/joinRoom', roomController.joinRoom_post);
router.post('/leaveRoom', roomController.leaveRoom_post);
router.post('/quickJoin', roomController.quickjoin_post);
router.post('/startGame', roomController.startGame_post);
router.post('/timeUp', roomController.timeUp_post);
router.post('/restartGame', roomController.restartGame_post);

module.exports = router;



