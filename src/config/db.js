const mongoose = require('mongoose');

mongoose.set('autoIndex', process.env.NODE_ENV !== 'production');

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
});
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

const connectDB = async () => {
  const options = process.env.MONGO_SSL ? { ssl: process.env.MONGO_SSL === 'true' } : {};
  await mongoose.connect(process.env.MONGO_URI, options);
  console.log('MongoDB connected');
};

module.exports = connectDB;
