'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { startRegistration } from '@simplewebauthn/browser';

type User = { id: string; email: string; hasRecovery: boolean };

const box = {
  background: '#f5f5f5',
  padding: 16,
  borderRadius: 8,
  marginTop: 16
} as const;
const input = {
  display: 'block',
  width: '100%',
  padding: 8,
  marginBottom: 10,
  boxSizing: 'border-box'
} as const;
const button = {
  padding: '10px 20px',
  fontSize: 16,
  cursor: 'pointer',
  border: 'none',
  borderRadius: 4,
  color: 'white'
} as const;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [birthYear, setBirthYear] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        setUser(await response.json());
      } else {
        router.push('/passkeys');
      }
    } catch (error) {
      router.push('/passkeys');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        router.push('/passkeys');
      } else {
        alert('Logout failed');
      }
    } catch (error) {
      alert('Logout failed');
    }
  }

  async function handleSaveRecovery() {
    setMessage('');
    const resp = await fetch('/api/recovery/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthYear, password })
    });
    const data = await resp.json();
    if (resp.ok) {
      setMessage('✅ Recovery info saved.');
      setPassword('');
      setBirthYear('');
      loadUser();
    } else {
      setMessage(`❌ ${data.error || 'Could not save recovery info'}`);
    }
  }

  // Lets a recovered user (or anyone signed in) add a passkey on this device.
  async function handleAddPasskey() {
    if (!user) return;
    setMessage('');
    try {
      const optResp = await fetch(
        '/api/passkeys/generate-registration-options',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email })
        }
      );
      const options = await optResp.json();
      if (!optResp.ok) throw new Error(options.error || 'Failed');

      const attResp = await startRegistration({ optionsJSON: options });
      const verifResp = await fetch('/api/passkeys/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp)
      });
      const result = await verifResp.json();
      if (!result.verified) throw new Error(result.error || 'Failed');
      setMessage('✅ New passkey added to your account.');
    } catch (error) {
      setMessage(`❌ ${(error as Error).message}`);
    }
  }

  if (loading) {
    return (
      <main
        style={{
          maxWidth: 520,
          margin: '3rem auto',
          fontFamily: 'system-ui',
          textAlign: 'center'
        }}>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: 520,
        margin: '3rem auto',
        fontFamily: 'system-ui',
        lineHeight: 1.4
      }}>
      <h1>Dashboard</h1>
      <p>Welcome! You're signed in.</p>

      {user && (
        <div style={box}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>Your Account</h2>
          <p style={{ margin: '8px 0' }}>
            <strong>Email:</strong> {user.email}
          </p>
          <p style={{ margin: '8px 0' }}>
            <strong>User ID:</strong> {user.id}
          </p>
        </div>
      )}

      <div style={box}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Account recovery</h2>
        <p style={{ marginTop: 0, fontSize: 14 }}>
          {user?.hasRecovery
            ? '✅ Recovery is set up. You can change it below.'
            : '⚠️ Not set up. If you lose your passkey you will not be able to get back in. Set a birth year and a recovery password.'}
        </p>
        <input
          type='number'
          placeholder='Birth year'
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value)}
          style={input}
        />
        <input
          type='password'
          placeholder='Recovery password (min. 8 characters)'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete='new-password'
          style={input}
        />
        <button
          onClick={handleSaveRecovery}
          style={{ ...button, background: '#4f46e5' }}>
          Save recovery info
        </button>
      </div>

      <div style={box}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Passkeys</h2>
        <p style={{ marginTop: 0, fontSize: 14 }}>
          Lost your old device? Add a passkey for this one.
        </p>
        <button
          onClick={handleAddPasskey}
          style={{ ...button, background: '#4f46e5' }}>
          Add a passkey on this device
        </button>
      </div>

      {message && <p style={{ marginTop: 16 }}>{message}</p>}

      <div style={{ marginTop: 24 }}>
        <button
          onClick={handleLogout}
          style={{ ...button, background: '#dc2626' }}>
          Logout
        </button>
      </div>
    </main>
  );
}
