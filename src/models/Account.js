const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
      maxlength: [49, 'Account name must be less than 50 characters'],
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'user_id is required'],
    },
  },
  { timestamps: true }
);

accountSchema.index({ user_id: 1 });

accountSchema.set('toJSON', {
  versionKey: false,
  transform: (doc, ret) => {
    const accountId = ret._id;
    ret._links = {
      update: { method: 'PUT', href: `/api/accounts/${accountId}` },
      delete: { method: 'DELETE', href: `/api/accounts/${accountId}` },
      create_transaction: { method: 'POST', href: `/api/accounts/${accountId}/transactions` },
      transactions: { method: 'GET', href: `/api/accounts/${accountId}/transactions` },
      pending_transactions: { method: 'GET', href: `/api/accounts/${accountId}/transactions/pending` },
    };
    return ret;
  },
});

module.exports = mongoose.model('Account', accountSchema);
