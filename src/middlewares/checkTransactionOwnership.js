const Transaction = require('../models/Transaction');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

module.exports = catchAsync(async (req, res, next) => {
  const { accountId, transactionId } = req.params;

  const transaction = await Transaction.findById(transactionId).populate({
    path: 'account_id',
    select: 'user_id',
  });

  if (!transaction) {
    return next(new AppError('Transaction not found', 404));
  }

  const parentAccount = transaction.account_id;

  if (!parentAccount) {
    return next(new AppError('Transaction not found', 404));
  }

  if (accountId && parentAccount._id.toString() !== accountId) {
    return next(new AppError('Transaction not found', 404));
  }

  if (parentAccount.user_id.toString() !== req.user.id) {
    return next(new AppError('You do not have access to this transaction', 403));
  }

  transaction.account_id = parentAccount._id;

  res.locals.transaction = transaction;
  return next();
});
