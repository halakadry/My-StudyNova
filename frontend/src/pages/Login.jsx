
import { useState } from 'react';

import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth';

import {
  auth,
  googleProvider
} from '../services/firebase';

import '../services/Register.css';
import '../services/Login.css';


/* ========================================
   LOGIN SECURITY SETTINGS
======================================== */

const MAX_ATTEMPTS = 3;

const LOCK_DURATION_MS = 15 * 60 * 1000;


/* ========================================
   LOGIN COMPONENT
======================================== */

function Login({ onSwitchToRegister }) {

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [error, setError] = useState('');

  const [attempts, setAttempts] = useState(0);

  const [lockedUntil, setLockedUntil] = useState(null);

  const [showPassword, setShowPassword] = useState(false);


  const isLocked =
    lockedUntil && Date.now() < lockedUntil;


  /* ========================================
     EMAIL AND PASSWORD LOGIN
  ======================================== */

  const handleLogin = async (e) => {

    e.preventDefault();

    setError('');

    if (isLocked) {

      const minutesLeft = Math.ceil(
        (lockedUntil - Date.now()) / 60000
      );

      setError(
        `Too many failed attempts. Try again in ${minutesLeft} minute(s).`
      );

      return;
    }

    try {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      setAttempts(0);

      // Your existing Firebase authentication
      // flow continues here.

    } catch (err) {

      const newAttempts = attempts + 1;

      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {

        setLockedUntil(
          Date.now() + LOCK_DURATION_MS
        );

        setError(
          'Too many failed attempts. Account locked for 15 minutes.'
        );

      } else {

        setError(
          `Invalid email or password. ${MAX_ATTEMPTS - newAttempts} attempt(s) left.`
        );

      }

    }

  };


  /* ========================================
     GOOGLE LOGIN
  ======================================== */

  const handleGoogleLogin = async () => {

    setError('');

    try {

      await signInWithPopup(
        auth,
        googleProvider
      );

      // Your existing Firebase authentication
      // flow continues here.

    } catch (err) {

      setError(
        'Google sign-in failed.'
      );

    }

  };


  /* ========================================
     FORGOT PASSWORD
  ======================================== */

  const handleForgotPassword = async () => {

    if (!email) {

      setError(
        'Enter your email above first, then click "Forgot password".'
      );

      return;
    }

    try {

      await sendPasswordResetEmail(
        auth,
        email
      );

      setError(
        'Password reset email sent.'
      );

    } catch (err) {

      setError(
        'Could not send reset email. Check the address and try again.'
      );

    }

  };


  /* ========================================
     LOGIN PAGE DESIGN
  ======================================== */

  return (

    <div className="sn-page sn-login-page">

      <div className="sn-layout">


        {/* ==================================
            LEFT SIDE
        ================================== */}

        <div className="sn-left">


          {/* STUDYNOVA LOGO */}

          <div className="sn-logo">

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


            <div className="sn-logo-text">

              Study<span>Nova</span>

            </div>

          </div>



          {/* TAGLINE */}

          <div className="sn-tagline">

            PLAN · ORGANIZE · ACHIEVE

          </div>



          {/* DECORATIVE LINE */}

          <div className="sn-accent-line"></div>



          {/* WELCOME MESSAGE */}

          <h1 className="sn-login-heading">

            Welcome back

            <br />

            to StudyNova

          </h1>


          <p className="sn-login-description">

            Log in to continue your

            <br />

            academic journey.

          </p>



          {/* DECORATIVE LEAVES */}

          <svg
            className="sn-login-leaf"
            viewBox="0 0 150 150"
            fill="none"
            aria-hidden="true"
          >

            <path
              d="M25 140C40 105 62 70 110 25"
              stroke="#59674A"
              strokeWidth="2"
              strokeLinecap="round"
            />

            <path
              d="M57 103C22 98 15 72 17 53C44 58 60 78 57 103Z"
              fill="#8A967C"
            />

            <path
              d="M79 73C75 40 95 23 119 16C121 43 105 64 79 73Z"
              fill="#69785A"
            />

            <path
              d="M39 123C13 116 6 98 7 83C30 87 43 103 39 123Z"
              fill="#A5AE99"
            />

          </svg>


        </div>



        {/* ==================================
            RIGHT SIDE - LOGIN CARD
        ================================== */}

        <div className="sn-card">


          {/* LOGIN TITLE */}

          <h1 className="sn-card-title">

            Log in

          </h1>



          {/* LOGIN FORM */}

          <form
            className="sn-form"
            onSubmit={handleLogin}
          >



            {/* EMAIL */}

            <div className="sn-field">

              <label htmlFor="login-email">

                Email

              </label>


              <div className="sn-input-wrapper">


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



                <input
                  id="login-email"

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

              <label htmlFor="login-password">

                Password

              </label>


              <div className="sn-input-wrapper">


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



                <input
                  id="login-password"

                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }

                  placeholder="Enter your password"

                  value={password}

                  onChange={(e) =>
                    setPassword(e.target.value)
                  }

                  autoComplete="current-password"

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

                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />

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



            {/* FORGOT PASSWORD */}

            <div className="sn-forgot-wrapper">

              <button
                type="button"

                className="sn-forgot-button"

                onClick={handleForgotPassword}
              >

                Forgot password?

              </button>

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



            {/* LOGIN BUTTON */}

            <button
              type="submit"

              className="sn-register-button"

              disabled={isLocked}
            >

              Log in →

            </button>


          </form>



          {/* DIVIDER */}

          <div className="sn-divider">

            <span>or</span>

          </div>



          {/* GOOGLE LOGIN */}

          <button
            type="button"

            className="sn-google-button"

            onClick={handleGoogleLogin}
          >

            <span className="sn-google-icon">

              G

            </span>

            Continue with Google

          </button>



          {/* SWITCH TO REGISTER */}

          <p className="sn-login-text">

            Don't have an account?

            <button
              type="button"

              className="sn-login-button"

              onClick={onSwitchToRegister}
            >

              Register

            </button>

          </p>


        </div>


      </div>

    </div>

  );

}


export default Login;