const Account = require('../models/Account');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

module.exports = catchAsync(async (req, res, next) => {
  const { accountId } = req.params;

  const account = await Account.findById(accountId);

  if (!account) {
    return next(new AppError('Account not found', 404));
  }

  if (account.user_id.toString() !== req.user.id) {
    return next(new AppError('You do not have access to this account', 403));
  }

  res.locals.account = account;
  return next();
});
