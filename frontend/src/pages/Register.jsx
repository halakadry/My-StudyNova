
import { useState } from 'react';

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

import { auth } from '../services/firebase';

import api from '../services/api';

import '../services/Register.css';


/* =====================================
   STUDYNOVA LOGO
===================================== */

function BookIcon() {
  return (
    <svg
      className="sn-logo-icon"
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M40 65C29 55 17 53 5 55V13C19 10 31 15 40 25V65Z"
        stroke="#947A32"
        strokeWidth="2"
      />

      <path
        d="M40 65C51 55 63 53 75 55V13C61 10 49 15 40 25V65Z"
        fill="#59674A"
      />

      <path
        d="M40 65C29 58 17 57 5 59"
        stroke="#59674A"
        strokeWidth="2"
      />

      <path
        d="M40 65C51 58 63 57 75 59"
        stroke="#947A32"
        strokeWidth="2"
      />
    </svg>
  );
}


/* =====================================
   FORM ICONS
===================================== */

function UserIcon() {
  return (
    <svg
      className="sn-input-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />

      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </svg>
  );
}


function EmailIcon() {
  return (
    <svg
      className="sn-input-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />

      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}


function LockIcon() {
  return (
    <svg
      className="sn-input-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="10"
        width="16"
        height="11"
        rx="2"
      />

      <path d="M8 10V7a4 4 0 0 1 8 0v3" />

      <path d="M12 14v3" />
    </svg>
  );
}


/* =====================================
   BRAND COMPONENT
===================================== */

function StudyNovaBrand() {
  return (
    <div className="sn-register-brand">

      <div className="sn-register-logo">

        <BookIcon />

        <div className="sn-logo-text">

          Study<span>Nova</span>

        </div>

      </div>

      <div className="sn-register-tagline">

        PLAN · ORGANIZE · ACHIEVE

      </div>

    </div>
  );
}


/* =====================================
   REGISTER COMPONENT
===================================== */

function Register({ onSwitchToLogin }) {

  const [name, setName] = useState('');

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [error, setError] = useState('');

  const [success, setSuccess] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);


  /* =====================================
     EMAIL REGISTRATION
  ===================================== */

  const handleRegister = async (e) => {

    e.preventDefault();

    if (loading) return;

    setError('');

    if (password.length < 6) {

      setError(
        'Password must be at least 6 characters.'
      );

      return;
    }

    setLoading(true);

    try {

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      const firebaseUid =
        userCredential.user.uid;


      // Save user to our backend / MongoDB

      await api.post('/users', {

        firebaseUid,

        name: name.trim(),

        email

      });


      setSuccess(true);

    } catch (err) {

      if (
        err.code === 'auth/email-already-in-use'
      ) {

        setError(
          'An account with this email already exists.'
        );

      } else {

        setError(
          'Could not create account. Please try again.'
        );

      }

    } finally {

      setLoading(false);

    }

  };


  /* =====================================
     GOOGLE REGISTRATION
  ===================================== */

  const handleGoogleRegister = async () => {

    if (loading) return;

    setError('');

    setLoading(true);

    try {

      const provider = new GoogleAuthProvider();

      const result =
        await signInWithPopup(
          auth,
          provider
        );

      const firebaseUid =
        result.user.uid;


      // Save Google user to MongoDB

      await api.post('/users', {

        firebaseUid,

        name:
          result.user.displayName || '',

        email:
          result.user.email

      });


      setSuccess(true);

    } catch (err) {

      if (
        err.code !== 'auth/popup-closed-by-user'
      ) {

        setError(
          'Google sign-in failed. Please try again.'
        );

      }

    } finally {

      setLoading(false);

    }

  };


  /* =====================================
     SUCCESS SCREEN
  ===================================== */

  if (success) {

    return (

      <div className="sn-page">

        <div className="sn-layout">

          <div className="sn-card">

            <StudyNovaBrand />

            <div className="sn-success-icon">

              ✓

            </div>

            <h1 className="sn-card-title">

              Account Created!

            </h1>

            <p className="sn-success-message">

              Welcome to StudyNova!

              <br />

              Your account has been created
              successfully.

              <br />

              You can now log in and
              start planning your studies.

            </p>

            <button
              type="button"
              className="sn-register-button"
              onClick={onSwitchToLogin}
            >

              Go to Login →

            </button>

          </div>

        </div>

      </div>

    );

  }


  /* =====================================
     REGISTER PAGE DESIGN
  ===================================== */

  return (

    <div className="sn-page">

      <div className="sn-layout">

        <div className="sn-card">


          {/* STUDYNOVA LOGO */}

          <StudyNovaBrand />


          {/* CREATE ACCOUNT */}

          <h1 className="sn-card-title">

            Create Account

          </h1>


          {/* REGISTRATION FORM */}

          <form
            className="sn-form"
            onSubmit={handleRegister}
          >


            {/* FULL NAME */}

            <div className="sn-field">

              <label htmlFor="sn-name">

                Full name

              </label>

              <div className="sn-input-wrapper">

                <UserIcon />

                <input
                  id="sn-name"
                  type="text"

                  placeholder="Enter your full name"

                  value={name}

                  onChange={(e) =>
                    setName(e.target.value)
                  }

                  autoComplete="name"

                  required
                />

              </div>

            </div>


            {/* EMAIL */}

            <div className="sn-field">

              <label htmlFor="sn-email">

                Email

              </label>

              <div className="sn-input-wrapper">

                <EmailIcon />

                <input
                  id="sn-email"
                  type="email"

                  placeholder="Enter your email address"

                  value={email}

                  onChange={(e) =>
                    setEmail(e.target.value)
                  }

                  autoComplete="email"

                  required
                />

              </div>

            </div>


            {/* PASSWORD */}

            <div className="sn-field">

              <label htmlFor="sn-password">

                Password

              </label>

              <div className="sn-input-wrapper">

                <LockIcon />

                <input
                  id="sn-password"

                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }

                  placeholder="Create a password"

                  value={password}

                  onChange={(e) =>
                    setPassword(e.target.value)
                  }

                  autoComplete="new-password"

                  minLength={6}

                  required
                />


                {/* SHOW / HIDE PASSWORD */}

                <button
                  type="button"

                  className="sn-eye-button"

                  onClick={() =>
                    setShowPassword(!showPassword)
                  }

                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }

                  aria-pressed={showPassword}
                >

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >

                    <path
                      d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"
                    />

                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                    />

                    {!showPassword && (

                      <path d="M3 3l18 18" />

                    )}

                  </svg>

                </button>

              </div>

            </div>


            {/* ERROR MESSAGE */}

            {error && (

              <div
                className="sn-error"
                role="alert"
              >

                {error}

              </div>

            )}


            {/* REGISTER BUTTON */}

            <button
              type="submit"

              className="sn-register-button"

              disabled={loading}
            >

              {loading
                ? 'Please wait...'
                : 'Register →'
              }

            </button>

          </form>


          {/* DIVIDER */}

          <div className="sn-divider">

            <span>or</span>

          </div>


          {/* GOOGLE REGISTRATION */}

          <button
            type="button"

            className="sn-google-button"

            onClick={handleGoogleRegister}

            disabled={loading}
          >

            <span className="sn-google-icon">

              G

            </span>

            Continue with Google

          </button>


          {/* LOGIN LINK */}

          <p className="sn-login-text">

            Already have an account?

            <button
              type="button"

              className="sn-login-button"

              onClick={onSwitchToLogin}
            >

              Log in

            </button>

          </p>


        </div>

      </div>

    </div>

  );

}


export default Register;