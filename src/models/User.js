const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PASSWORD_STRENGTH_REGEX = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false,
      validate: {
        validator: (value) => PASSWORD_STRENGTH_REGEX.test(value),
        message: 'Password must contain at least one digit and one special character',
      },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

userSchema.set('toJSON', {
  versionKey: false,
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
