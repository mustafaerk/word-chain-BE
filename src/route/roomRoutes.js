const { Router } = require('express');
const roomController = require('../controllers/roomController');
const verifyJwt = require('../middleware/jwtVerify');

const router = Router();

router.post('/createRoom', verifyJwt, roomController.createRoom_post);
router.get('/listRooms', verifyJwt, roomController.listRoom_get);
router.post('/joinRoom', verifyJwt, roomController.joinRoom_post);
router.post('/leaveRoom', verifyJwt, roomController.leaveRoom_post);
router.post('/quickJoin', verifyJwt, roomController.quickjoin_post);
router.post('/startGame', verifyJwt, roomController.startGame_post);

module.exports = router;



