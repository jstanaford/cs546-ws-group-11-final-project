// client side checks for the sign in and sign up forms. this is only here to save the user a
// round trip - the server checks all of it again, because anything out here can be turned off

const showError = (form, message) => {
  let errorBox = document.getElementById('client-error');

  if (errorBox === null) {
    errorBox = document.createElement('p');
    errorBox.id = 'client-error';
    errorBox.className = 'error';
    form.parentNode.insertBefore(errorBox, form);
  }

  errorBox.textContent = message;
};

const checkEmailLooksRight = (email) => {
  if (email.length === 0) {
    return 'Please enter your email.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return 'That does not look like an email address.';
  }
  return null;
};

const registerForm = document.getElementById('register-form');

if (registerForm !== null) {
  registerForm.addEventListener('submit', (event) => {
    let firstName = document.getElementById('firstName').value.trim();
    let lastName = document.getElementById('lastName').value.trim();
    let email = document.getElementById('email').value.trim();
    let password = document.getElementById('password').value;
    let confirmPassword = document.getElementById('confirmPassword').value;

    let problem = null;

    if (firstName.length === 0) {
      problem = 'Please enter your first name.';
    } else if (lastName.length === 0) {
      problem = 'Please enter your last name.';
    } else {
      problem = checkEmailLooksRight(email);
    }

    // password rules have to match the ones in data/users.js. if you change them there,
    // change them here too or people get told it worked and then it did not
    if (problem === null) {
      if (password.length < 8) {
        problem = 'Your password has to be at least 8 characters.';
      } else if (/\s/.test(password)) {
        problem = 'Your password cannot have spaces in it.';
      } else if (!/[A-Z]/.test(password)) {
        problem = 'Your password needs at least one uppercase letter.';
      } else if (!/[0-9]/.test(password)) {
        problem = 'Your password needs at least one number.';
      } else if (password !== confirmPassword) {
        problem = 'The two passwords do not match.';
      }
    }

    if (problem !== null) {
      event.preventDefault();
      showError(registerForm, problem);
    }
  });
}

const loginForm = document.getElementById('login-form');

if (loginForm !== null) {
  loginForm.addEventListener('submit', (event) => {
    let email = document.getElementById('email').value.trim();
    let password = document.getElementById('password').value;

    let problem = checkEmailLooksRight(email);

    if (problem === null && password.length === 0) {
      problem = 'Please enter your password.';
    }

    if (problem !== null) {
      event.preventDefault();
      showError(loginForm, problem);
    }
  });
}
