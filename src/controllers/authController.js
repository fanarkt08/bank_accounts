const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const isNonEmptyString = require('../utils/isNonEmptyString');

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

const DUMMY_PASSWORD_HASH = '$2a$12$YTma.eHT6yqIkYx9LWMeGO8L74mrqI2fedcjlAp98eubwZiRE9w3G';

exports.register = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    return next(new AppError('Email and password are required', 400));
  }

  const user = await User.create({ email, password });

  res.status(201).json({ status: 'success', data: { user } });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    return next(new AppError('Email and password are required', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  const isPasswordValid = await bcrypt.compare(password, user ? user.password : DUMMY_PASSWORD_HASH);

  if (!user || !isPasswordValid) {
    return next(new AppError('Invalid email or password', 401));
  }

  const token = signToken(user._id);

  res.status(200).json({ status: 'success', data: { token } });
});
