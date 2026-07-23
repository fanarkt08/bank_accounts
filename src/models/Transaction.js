const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, 'Label is required'],
      trim: true,
      minlength: [2, 'Label must be at least 2 characters long'],
      maxlength: [50, 'Label must be less than 50 characters'],
    },
    type: {
      type: String,
      required: [true, 'Type is required'],
      enum: {
        values: ['credit', 'debit'],
        message: 'Type must be either "credit" or "debit"',
      },
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be a positive number'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    payment_method: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: {
        values: ['Credit Card', 'Direct Deposit', 'Cash', 'Bank Transfer'],
        message: 'Invalid payment method',
      },
    },
    is_pending: {
      type: Boolean,
      required: [true, 'is_pending is required'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['Food', 'Income', 'Shopping', 'Housing', 'Travel'],
        message: 'Invalid category',
      },
    },
    account_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'account_id is required'],
    },
  },
  { timestamps: true }
);

transactionSchema.index({ account_id: 1, date: -1 });
transactionSchema.index({ account_id: 1, is_pending: 1 });

const resolveAccountId = (rawAccountId) => {
  if (!rawAccountId) return null;
  if (typeof rawAccountId === 'object') {
    return (rawAccountId._id || rawAccountId.id || rawAccountId).toString();
  }
  return rawAccountId.toString();
};

transactionSchema.set('toJSON', {
  versionKey: false,
  transform: (doc, ret) => {
    const accountId = resolveAccountId(ret.account_id);
    ret._links = {
      update: { method: 'PUT', href: `/api/accounts/${accountId}/transactions/${ret._id}` },
      delete: { method: 'DELETE', href: `/api/accounts/${accountId}/transactions/${ret._id}` },
    };
    return ret;
  },
});

module.exports = mongoose.model('Transaction', transactionSchema);
