const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser, approveUser } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.route('/:id/approve').put(protect, approveUser);

router.route('/')
    .get(protect, getUsers)
    .post(protect, createUser);

router.route('/:id')
    .put(protect, updateUser)
    .delete(protect, deleteUser);


module.exports = router;
