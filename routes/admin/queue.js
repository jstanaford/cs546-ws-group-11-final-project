import {Router} from 'express';
import {
  approveRequest,
  denyRequest,
  getRequestQueue,
  issueRequest,
  releaseRequest
} from '../../data/adminQueue.js';
import {createLoan, getWalkUpOptions} from '../../data/loans.js';
import {loanRow, operationError, renderOperations, showOperationError} from './operationsView.js';

const router = Router();

// core 7, the request queue and walk up checkouts. part e
// add your routes above the export. already mounted at /admin/queue in routes/index.js

const renderQueue = async (req, res, error) => {
  const [records, {borrowers, items}] = await Promise.all([getRequestQueue(), getWalkUpOptions()]);
  return renderOperations(
    res,
    'queue',
    'Request Queue',
    {
      pending: records.filter(({status}) => status === 'pending').map(loanRow),
      approved: records.filter(({status}) => status === 'approved').map(loanRow),
      borrowers: borrowers.map((borrower) => ({...borrower, id: String(borrower._id)})),
      items: items.map((item) => ({...item, id: String(item._id)})),
      needsWalkUpOptions: !borrowers.length || !items.length,
      error: error?.message,
      saved: req.query.saved === '1'
    },
    error?.status
  );
};

router.get('/', async (req, res) => {
  try {
    return await renderQueue(req, res);
  } catch (error) {
    return showOperationError(res, error);
  }
});

const handleAction =
  (action, message = 'Changes saved.') =>
  async (req, res) => {
    const wantsJson = req.is('application/json');
    try {
      await action(req, req.session.user._id);
      if (wantsJson) return res.json({message});
      return res.redirect(303, '/admin/queue?saved=1');
    } catch (error) {
      const failure = operationError(error);
      if (wantsJson) return res.status(failure.status).json({message: failure.message});
      return renderQueue(req, res, failure).catch((err) => showOperationError(res, err));
    }
  };

router.post(
  '/walk-up',
  handleAction((req, admin) =>
    createLoan(req.body?.userId, req.body?.equipmentId, req.body?.loanType, admin)
  )
);
router.post(
  '/:id/approve',
  handleAction((req, admin) => approveRequest(req.params.id, admin))
);
router.post(
  '/:id/deny',
  handleAction(
    (req, admin) => denyRequest(req.params.id, admin, req.body?.reason),
    'Request denied.'
  )
);
router.post(
  '/:id/issue',
  handleAction((req, admin) => issueRequest(req.params.id, admin))
);
router.post(
  '/:id/release',
  handleAction((req) => releaseRequest(req.params.id))
);

export default router;
