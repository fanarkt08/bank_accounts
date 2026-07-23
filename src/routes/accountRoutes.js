const express = require('express');
const accountController = require('../controllers/accountController');
const auth = require('../middlewares/auth');
const checkAccountOwnership = require('../middlewares/checkAccountOwnership');
const methodNotAllowed = require('../utils/methodNotAllowed');
const transactionRoutes = require('./transactionRoutes');

const router = express.Router();

router.use(auth);

router.post('/', accountController.createAccount);
router.get('/', accountController.getAccounts);
router.all('/', methodNotAllowed('GET', 'POST'));

router.get('/global-balance', accountController.getGlobalBalance);
router.all('/global-balance', methodNotAllowed('GET'));

router.put('/:accountId', checkAccountOwnership, accountController.updateAccount);
router.delete('/:accountId', checkAccountOwnership, accountController.deleteAccount);
router.all('/:accountId', methodNotAllowed('PUT', 'DELETE'));

router.use('/:accountId/transactions', transactionRoutes);

module.exports = router;
