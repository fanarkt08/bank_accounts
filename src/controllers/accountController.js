const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const isNonEmptyString = require('../utils/isNonEmptyString');
const paginate = require('../utils/paginate');
const isTransactionsUnsupportedError = require('../utils/isTransactionsUnsupportedError');

exports.createAccount = catchAsync(async (req, res, next) => {
  const { name } = req.body;

  if (!isNonEmptyString(name)) {
    return next(new AppError('Account name is required', 400));
  }

  const account = await Account.create({ name, user_id: req.user.id });

  res.status(201).json({ status: 'success', data: { account } });
});

exports.getAccounts = catchAsync(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);
  const { page, limit, skip } = paginate(req.query);

  const results = await Account.aggregate([
    { $match: { user_id: userId } },
    {
      $lookup: {
        from: 'transactions',
        localField: '_id',
        foreignField: 'account_id',
        as: 'transactions',
      },
    },
    {
      $addFields: {
        balance: {
          $sum: {
            $map: {
              input: '$transactions',
              as: 'tx',
              in: {
                $cond: [{ $eq: ['$$tx.type', 'credit'] }, '$$tx.amount', { $multiply: ['$$tx.amount', -1] }],
              },
            },
          },
        },
      },
    },
    { $project: { transactions: 0 } },
    { $sort: { createdAt: 1 } },
    { $skip: skip },
    { $limit: limit },
  ]);

  const accounts = results.map((result) => {
    const account = Account.hydrate(result).toJSON();
    account.balance = result.balance;
    return account;
  });

  res.status(200).json({ status: 'success', results: accounts.length, page, limit, data: { accounts } });
});

exports.getGlobalBalance = catchAsync(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);

  const result = await Account.aggregate([
    { $match: { user_id: userId } },
    {
      $lookup: {
        from: 'transactions',
        localField: '_id',
        foreignField: 'account_id',
        as: 'transactions',
      },
    },
    { $unwind: { path: '$transactions', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: null,
        balance: {
          $sum: {
            $switch: {
              branches: [
                { case: { $eq: ['$transactions.type', 'credit'] }, then: '$transactions.amount' },
                { case: { $eq: ['$transactions.type', 'debit'] }, then: { $multiply: ['$transactions.amount', -1] } },
              ],
              default: 0,
            },
          },
        },
      },
    },
  ]);

  const balance = result.length ? result[0].balance : 0;

  res.status(200).json({ status: 'success', data: { balance } });
});

exports.updateAccount = catchAsync(async (req, res, next) => {
  const { account } = res.locals;
  const { name } = req.body;

  if (!isNonEmptyString(name)) {
    return next(new AppError('Account name is required', 400));
  }

  account.name = name;
  await account.save();

  res.status(200).json({ status: 'success', data: { account } });
});

exports.deleteAccount = catchAsync(async (req, res) => {
  const { account } = res.locals;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Transaction.deleteMany({ account_id: account._id }, { session });
      await account.deleteOne({ session });
    });
  } catch (err) {
    if (!isTransactionsUnsupportedError(err)) throw err;
    await Transaction.deleteMany({ account_id: account._id });
    await account.deleteOne();
  } finally {
    await session.endSession();
  }

  res.status(200).json({ status: 'success', message: 'Account and its transactions deleted successfully' });
});
