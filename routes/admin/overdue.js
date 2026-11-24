import {Router} from 'express';
import {getOverdueLoans} from '../../data/loans.js';
import {loanRow, renderOperations, showOperationError} from './operationsView.js';

const router = Router();

// core 9, overdue management. part e
// add your routes above the export. already mounted at /admin/overdue in routes/index.js

router.get('/', async (req, res) => {
  try {
    const search = req.query.search ?? '';
    const loans = await getOverdueLoans(search);
    return renderOperations(res, 'overdue', 'Overdue Loans', {
      search: search.trim(),
      loans: loans.map(loanRow)
    });
  } catch (error) {
    return showOperationError(res, error);
  }
});

export default router;
