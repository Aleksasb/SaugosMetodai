'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Not authenticated, redirect to login
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
      const response = await fetch('/api/auth/logout', {
        method: 'POST'
      });

      if (response.ok) {
        router.push('/passkeys');
      } else {
        alert('Logout failed');
      }
    } catch (error) {
      alert('Logout failed');
    }
  }

  if (loading) {
    return (
      <main
        style={{
          maxWidth: 520,
          margin: '3rem auto',
          fontFamily: 'system-ui',
          lineHeight: 1.4,
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
      <p>Welcome! You're signed in with your passkey.</p>

      {user && (
        <div
          style={{
            background: '#f5f5f5',
            padding: 16,
            borderRadius: 8,
            marginTop: 16
          }}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>Your Account</h2>
          <p style={{ margin: '8px 0' }}>
            <strong>Email:</strong> {user.email || 'Not available'}
          </p>
          <p style={{ margin: '8px 0' }}>
            <strong>User ID:</strong> {user.id || 'Not available'}
          </p>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            fontSize: 16,
            cursor: 'pointer',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: 4
          }}>
          Logout
        </button>
      </div>

      <p style={{ marginTop: 24, fontSize: 14, opacity: 0.7 }}>
        This is a protected page. Only authenticated users can access it.
      </p>
    </main>
  );
}
