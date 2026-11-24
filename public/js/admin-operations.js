for (const form of document.querySelectorAll('[data-deny-request]')) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const errorField = form.querySelector('[data-form-error]');
    const reason = form.elements.reason.value.trim();
    const button = form.querySelector('button[type="submit"]');
    errorField.hidden = true;

    if (!reason || reason.length > 500) {
      errorField.textContent = 'Enter a denial reason between 1 and 500 characters.';
      errorField.hidden = false;
      form.elements.reason.focus();
      return;
    }

    button.disabled = true;
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Accept: 'application/json'},
        body: JSON.stringify({reason}),
        redirect: 'manual'
      });
      if (response.type === 'opaqueredirect') {
        throw new Error('Your session has expired. Sign in and try again.');
      }
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Could not deny this request. Refresh the page and try again.');
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      form.closest('tr').remove();
      const pending = document.querySelector('#pending-requests');
      const message = document.querySelector('#queue-message');
      message.textContent = result.message;
      message.tabIndex = -1;
      message.focus();
      if (!pending.querySelector('tbody tr')) {
        pending.hidden = true;
        document.querySelector('#empty-requests').hidden = false;
      }
    } catch (error) {
      errorField.textContent = error.message;
      errorField.hidden = false;
    } finally {
      button.disabled = false;
    }
  });
}
