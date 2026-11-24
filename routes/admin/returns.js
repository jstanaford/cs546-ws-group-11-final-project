import {Router} from 'express';
import {getActiveLoans, processReturn} from '../../data/loans.js';
import {ENUMS} from '../../helpers/validation.js';
import {loanRow, operationError, renderOperations, showOperationError} from './operationsView.js';

const router = Router();

// core 8, processing returns and recording condition. part e
// add your routes above the export. already mounted at /admin/returns in routes/index.js

const renderReturns = async (req, res, error) =>
  renderOperations(
    res,
    'returns',
    'Process Returns',
    {
      loans: (await getActiveLoans()).map(loanRow),
      conditions: ENUMS.condition,
      saved: req.query.saved === '1',
      error: error?.message
    },
    error?.status
  );

router.get('/', async (req, res) => {
  try {
    return await renderReturns(req, res);
  } catch (error) {
    return showOperationError(res, error);
  }
});

router.post('/:id', async (req, res) => {
  try {
    await processReturn(req.params.id, req.body?.condition, req.body?.note, req.session.user._id);
    return res.redirect(303, '/admin/returns?saved=1');
  } catch (error) {
    return renderReturns(req, res, operationError(error)).catch((err) =>
      showOperationError(res, err)
    );
  }
});

export default router;
