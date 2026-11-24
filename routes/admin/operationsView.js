const dateLabel = (date) => (date instanceof Date ? date.toISOString().slice(0, 10) : null);

export const loanRow = (record) => ({
  ...record,
  id: String(record._id),
  borrowerName: record.borrower
    ? `${record.borrower.firstName} ${record.borrower.lastName}`
    : 'Unavailable account',
  itemName: record.item?.name ?? 'Unavailable equipment',
  assetTag: record.item?.assetTag,
  requested: dateLabel(record.requestedAt),
  issued: dateLabel(record.issuedAt),
  due: dateLabel(record.dueDate),
  loanTypeLabel: record.loanType === 'shortTerm' ? 'Short term' : 'Long term'
});

export const renderOperations = (res, page, title, fields, status = 200) =>
  res
    .status(status)
    .render(`admin/${page}`, {title, stylesheet: 'admin-operations.css', ...fields});

export const operationError = (error) => {
  if (typeof error === 'string') return {status: 400, message: error};
  console.error(error);
  return {status: 500, message: 'The operation could not be completed. Please try again.'};
};

export const showOperationError = (res, error) => {
  const {status, message} = operationError(error);
  return res.status(status).render('error', {title: 'Equipment Operations', code: status, message});
};
