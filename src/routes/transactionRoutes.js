const express = require('express');
const transactionController = require('../controllers/transactionController');
const checkAccountOwnership = require('../middlewares/checkAccountOwnership');
const checkTransactionOwnership = require('../middlewares/checkTransactionOwnership');
const methodNotAllowed = require('../utils/methodNotAllowed');

const router = express.Router({ mergeParams: true });

router.post('/', checkAccountOwnership, transactionController.createTransaction);
router.get('/', checkAccountOwnership, transactionController.getTransactions);
router.all('/', methodNotAllowed('GET', 'POST'));

router.get('/pending', checkAccountOwnership, transactionController.getPendingTransactions);
router.all('/pending', methodNotAllowed('GET'));

router.get('/populated', checkAccountOwnership, transactionController.getPopulatedTransactions);
router.all('/populated', methodNotAllowed('GET'));

router.put('/:transactionId', checkTransactionOwnership, transactionController.updateTransaction);
router.delete('/:transactionId', checkTransactionOwnership, transactionController.deleteTransaction);
router.all('/:transactionId', methodNotAllowed('PUT', 'DELETE'));

module.exports = router;
