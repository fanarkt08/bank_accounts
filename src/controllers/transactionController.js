const Transaction = require('../models/Transaction');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const paginate = require('../utils/paginate');

const ALLOWED_FIELDS = ['label', 'type', 'amount', 'date', 'payment_method', 'is_pending', 'category'];

const pickAllowedFields = (body) =>
  ALLOWED_FIELDS.reduce((acc, field) => {
    if (body[field] !== undefined) acc[field] = body[field];
    return acc;
  }, {});

const computeBalance = async (accountId) => {
  const result = await Transaction.aggregate([
    { $match: { account_id: accountId } },
    {
      $group: {
        _id: null,
        balance: { $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', { $multiply: ['$amount', -1] }] } },
      },
    },
  ]);
  return result.length ? result[0].balance : 0;
};

exports.createTransaction = catchAsync(async (req, res, next) => {
  const { account } = res.locals;
  const data = pickAllowedFields(req.body);

  const missingFields = ALLOWED_FIELDS.filter((field) => data[field] === undefined);
  if (missingFields.length) {
    return next(new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400));
  }

  const transaction = await Transaction.create({ ...data, account_id: account._id });

  res.status(201).json({ status: 'success', data: { transaction } });
});

exports.getTransactions = catchAsync(async (req, res) => {
  const { account } = res.locals;
  const { page, limit, skip } = paginate(req.query);

  const [transactions, balance] = await Promise.all([
    Transaction.find({ account_id: account._id }).sort({ date: -1 }).skip(skip).limit(limit),
    computeBalance(account._id),
  ]);

  res.status(200).json({ status: 'success', results: transactions.length, page, limit, data: { transactions, balance } });
});

exports.getPendingTransactions = catchAsync(async (req, res) => {
  const { account } = res.locals;
  const { page, limit, skip } = paginate(req.query);

  const transactions = await Transaction.find({ account_id: account._id, is_pending: true })
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({ status: 'success', results: transactions.length, page, limit, data: { transactions } });
});

exports.getPopulatedTransactions = catchAsync(async (req, res) => {
  const { account } = res.locals;
  const { page, limit, skip } = paginate(req.query);

  const transactions = await Transaction.find({ account_id: account._id })
    .populate('account_id')
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({ status: 'success', results: transactions.length, page, limit, data: { transactions } });
});

exports.updateTransaction = catchAsync(async (req, res) => {
  const { transaction } = res.locals;
  const data = pickAllowedFields(req.body);

  Object.assign(transaction, data);
  await transaction.save();

  res.status(200).json({ status: 'success', data: { transaction } });
});

exports.deleteTransaction = catchAsync(async (req, res) => {
  const { transaction } = res.locals;

  await transaction.deleteOne();

  res.status(200).json({ status: 'success', message: 'Transaction deleted successfully' });
});
