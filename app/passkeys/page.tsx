'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  startRegistration,
  startAuthentication
} from '@simplewebauthn/browser';

const inputClass =
  'w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';
const primaryBtn =
  'w-full px-4 py-3 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
const secondaryBtn =
  'w-full px-4 py-3 font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

export default function PasskeysPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Recovery is hidden until the user says they lost their passkey.
  const [recovering, setRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'info' | 'password'>('info');
  const [birthYear, setBirthYear] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    if (!email) {
      setMessage('Please enter an email address to register.');
      return;
    }

    try {
      setLoading(true);
      setMessage('Generating registration options...');

      const regResp = await fetch(
        '/api/passkeys/generate-registration-options',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        }
      );

      const options = await regResp.json();
      if (regResp.status !== 200) {
        throw new Error(
          options.error || 'Failed to generate registration options'
        );
      }

      setMessage('Please follow the prompt to create your passkey...');
      const attResp = await startRegistration({ optionsJSON: options });

      const verifResp = await fetch('/api/passkeys/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp)
      });

      const verificationJSON = await verifResp.json();
      if (verificationJSON && verificationJSON.verified) {
        setMessage('✅ Passkey registered! Redirecting to finish setup...');
        setTimeout(() => router.push('/dashboard'), 700);
      } else {
        throw new Error(
          verificationJSON.error || 'Registration verification failed'
        );
      }
    } catch (error) {
      const err = error as Error;
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setMessage('Generating authentication options...');

      // The server answers the same way whether or not the email exists, so an
      // unknown email just gets a normal passkey prompt and fails afterwards.
      const authResp = await fetch(
        '/api/passkeys/generate-authentication-options',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email || 'unknown' })
        }
      );

      const options = await authResp.json();
      if (authResp.status !== 200) {
        throw new Error(
          options.error || 'Failed to generate authentication options'
        );
      }

      setMessage('Please follow the prompt to use your passkey...');
      const asseResp = await startAuthentication({ optionsJSON: options });

      const verifResp = await fetch('/api/passkeys/verify-authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asseResp)
      });

      const verificationJSON = await verifResp.json();
      if (verificationJSON && verificationJSON.verified) {
        setMessage('✅ Sign-in successful! Redirecting...');
        setTimeout(() => router.push('/dashboard'), 500);
      } else {
        throw new Error('Sign-in failed.');
      }
    } catch (error) {
      const err = error as Error;
      if (err.name === 'NotAllowedError') {
        setMessage('Authentication cancelled.');
      } else {
        setMessage('❌ Sign-in failed.');
      }
      console.error('Sign-in error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ----- Recovery (only reachable through "Lost your passkey?") -----

  const openRecovery = () => {
    setRecovering(true);
    setRecoveryStep('info');
    setBirthYear('');
    setPassword('');
    setMessage('');
  };

  const closeRecovery = () => {
    setRecovering(false);
    setPassword('');
    setMessage('');
  };

  const handleRecoveryInfo = async () => {
    if (!email || !birthYear) {
      setMessage('Please enter your email and birth year.');
      return;
    }
    try {
      setLoading(true);
      const resp = await fetch('/api/recovery/verify-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, birthYear })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Something went wrong');
      // Same answer for everyone: always move on to the password step.
      setRecoveryStep('password');
      setMessage('');
    } catch (error) {
      setMessage(`❌ ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryLogin = async () => {
    if (!password) {
      setMessage('Please enter your recovery password.');
      return;
    }
    try {
      setLoading(true);
      const resp = await fetch('/api/recovery/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await resp.json();
      if (resp.ok && data.verified) {
        setMessage('✅ Recovered! Redirecting...');
        setTimeout(() => router.push('/dashboard'), 500);
      } else {
        // one password attempt per birth-year check -> go back to step 1
        setRecoveryStep('info');
        setPassword('');
        throw new Error(data.error || 'Recovery failed.');
      }
    } catch (error) {
      setMessage(`❌ ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4'>
      <div className='w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md'>
        <h1 className='text-3xl font-bold text-center text-gray-900'>
          🔐 Passkey Demo
        </h1>

        <div className='space-y-4'>
          <div>
            <label
              htmlFor='email'
              className='block text-sm font-medium text-gray-700 mb-2'>
              Email Address
            </label>
            <input
              id='email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='user@example.com'
              className={inputClass}
              autoComplete='username webauthn'
              disabled={loading || (recovering && recoveryStep === 'password')}
            />
          </div>

          {!recovering && (
            <>
              <div className='flex flex-col space-y-3'>
                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className={primaryBtn}>
                  {loading ? '⏳ Processing...' : '🆕 Register Passkey'}
                </button>
                <button
                  onClick={handleSignIn}
                  disabled={loading}
                  className={secondaryBtn}>
                  {loading ? '⏳ Processing...' : '🔑 Sign In with Passkey'}
                </button>
              </div>

              <div className='text-center'>
                <button
                  onClick={openRecovery}
                  disabled={loading}
                  className='text-sm text-gray-500 underline hover:text-gray-700'>
                  Lost your passkey?
                </button>
              </div>
            </>
          )}

          {recovering && recoveryStep === 'info' && (
            <div className='space-y-3'>
              <p className='text-sm text-gray-600'>
                Account recovery. First confirm your recovery info.
              </p>
              <div>
                <label
                  htmlFor='birthYear'
                  className='block text-sm font-medium text-gray-700 mb-2'>
                  Birth year
                </label>
                <input
                  id='birthYear'
                  type='number'
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  placeholder='e.g. 2001'
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <button
                onClick={handleRecoveryInfo}
                disabled={loading}
                className={primaryBtn}>
                {loading ? '⏳ Processing...' : 'Continue'}
              </button>
              <button
                onClick={closeRecovery}
                disabled={loading}
                className='w-full text-sm text-gray-500 underline hover:text-gray-700'>
                Back to passkey sign-in
              </button>
            </div>
          )}

          {recovering && recoveryStep === 'password' && (
            <div className='space-y-3'>
              <div>
                <label
                  htmlFor='password'
                  className='block text-sm font-medium text-gray-700 mb-2'>
                  Recovery password
                </label>
                <input
                  id='password'
                  type='password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  autoComplete='current-password'
                  disabled={loading}
                />
              </div>
              <button
                onClick={handleRecoveryLogin}
                disabled={loading}
                className={primaryBtn}>
                {loading ? '⏳ Processing...' : '🔒 Recover account'}
              </button>
              <button
                onClick={closeRecovery}
                disabled={loading}
                className='w-full text-sm text-gray-500 underline hover:text-gray-700'>
                Back to passkey sign-in
              </button>
            </div>
          )}

          {message && (
            <div
              className={`p-4 mt-4 text-sm rounded-md ${
                message.startsWith('❌')
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : message.startsWith('✅')
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}>
              {message}
            </div>
          )}
        </div>

        {!recovering && (
          <div className='text-center text-sm text-gray-600 mt-6'>
            <p>Sign in with your passkey. If you have lost it, use account recovery.</p>
          </div>
        )}
      </div>
    </div>
  );
}
