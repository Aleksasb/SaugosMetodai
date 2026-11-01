'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  startRegistration,
  startAuthentication
} from '@simplewebauthn/browser';

export default function PasskeysPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [method, setMethod] = useState<'passkey' | 'password'>('passkey');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email) {
      setMessage('Please enter an email address to register.');
      return;
    }

    try {
      setLoading(true);
      setMessage('Generating registration options...');

      // 1. Generate registration options on the server
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

      // 2. Start the registration process on the client
      setMessage('Please follow the prompt to create your passkey...');
      const attResp = await startRegistration({ optionsJSON: options });

      // 3. Verify the registration on the server
      const verifResp = await fetch('/api/passkeys/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp)
      });

      const verificationJSON = await verifResp.json();
      if (verificationJSON && verificationJSON.verified) {
        setMessage('✅ Passkey registered successfully! You can now sign in.');
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
    if (!email) {
      setMessage('Please enter your email address to sign in.');
      return;
    }

    try {
      setLoading(true);
      setMessage('Generating authentication options...');

      // 1. Generate authentication options on the server
      const authResp = await fetch(
        '/api/passkeys/generate-authentication-options',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        }
      );

      const options = await authResp.json();
      if (authResp.status !== 200) {
        throw new Error(
          options.error || 'Failed to generate authentication options'
        );
      }

      // 2. Start the authentication process on the client
      setMessage('Please follow the prompt to use your passkey...');
      const asseResp = await startAuthentication({ optionsJSON: options });

      // 3. Verify the authentication on the server
      const verifResp = await fetch('/api/passkeys/verify-authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asseResp)
      });
      const respText = await verifResp.text();

      const verificationJSON = JSON.parse(respText);
      if (verificationJSON && verificationJSON.verified) {
        setMessage('✅ Sign-in successful! Redirecting...');
        setTimeout(() => router.push('/dashboard'), 500);
      } else {
        throw new Error(
          verificationJSON.error || 'Authentication verification failed'
        );
      }
    } catch (error) {
      const err = error as Error;
      if (err.name === 'NotAllowedError') {
        setMessage('Authentication cancelled.');
      } else {
        setMessage(`❌ Error: ${err.message}`);
      }
      console.error('Sign-in error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordAuth = async (mode: 'register' | 'login') => {
    if (!email || !password) {
      setMessage('Please enter your email address and password.');
      return;
    }

    try {
      setLoading(true);
      setMessage(
        mode === 'register' ? 'Creating your account...' : 'Signing in...'
      );

      const resp = await fetch(`/api/auth/password/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await resp.json();

      if (resp.ok && data.verified) {
        setMessage('✅ Success! Redirecting...');
        setTimeout(() => router.push('/dashboard'), 500);
      } else {
        throw new Error(data.error || 'Password authentication failed');
      }
    } catch (error) {
      setMessage(`❌ Error: ${(error as Error).message}`);
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

        <div className='flex border-b border-gray-200'>
          {(['passkey', 'password'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMethod(m);
                setMessage('');
              }}
              disabled={loading}
              className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 ${
                method === m
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {m === 'passkey' ? '🔑 Passkey' : '🔒 Password'}
            </button>
          ))}
        </div>

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
              className='w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
              autoComplete='username webauthn'
              disabled={loading}
            />
          </div>

          {method === 'password' && (
          <div>
            <label
              htmlFor='password'
              className='block text-sm font-medium text-gray-700 mb-2'>
              Password
            </label>
            <input
              id='password'
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='At least 8 characters'
              className='w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
              autoComplete='current-password'
              disabled={loading}
            />
          </div>
          )}

          {method === 'passkey' && (
          <div className='flex flex-col space-y-3'>
            <button
              onClick={handleRegister}
              disabled={loading}
              className='w-full px-4 py-3 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
              {loading ? '⏳ Processing...' : '🆕 Register Passkey'}
            </button>
            <button
              onClick={handleSignIn}
              disabled={loading}
              className='w-full px-4 py-3 font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
              {loading ? '⏳ Processing...' : '🔑 Sign In with Passkey'}
            </button>
          </div>
          )}

          {method === 'password' && (
          <div className='flex flex-col space-y-3'>
            <button
              onClick={() => handlePasswordAuth('login')}
              disabled={loading}
              className='w-full px-4 py-3 font-medium text-white bg-gray-800 rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
              {loading ? '⏳ Processing...' : '🔒 Sign In with Password'}
            </button>
            <button
              onClick={() => handlePasswordAuth('register')}
              disabled={loading}
              className='w-full px-4 py-3 font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
              {loading ? '⏳ Processing...' : '✉️ Create Account with Password'}
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

        <div className='text-center text-sm text-gray-600 mt-6'>
          <p>
            {method === 'passkey'
              ? "Use your device's biometric authentication or security key"
              : 'Sign in with your email and password, or create a new account'}
          </p>
        </div>
      </div>
    </div>
  );
}
