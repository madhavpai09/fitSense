import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../api';

const Login = () => {
  const [rfidUid, setRfidUid] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!rfidUid) return;
    
    setLoading(true);
    setError('');
    try {
      const data = await fetchApi('/members/login', {
        method: 'POST',
        body: JSON.stringify({ rfid_uid: rfidUid }),
      });
      localStorage.setItem('memberData', JSON.stringify(data));
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Try a valid RFID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="card login-card flex flex-col gap-4">
        <div className="login-rfid-icon">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
            <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
            <circle cx="12" cy="12" r="2"/>
            <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
            <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
          </svg>
        </div>
        <h1 className="login-logo font-display">
          fitSense<span className="login-logo-dot"></span>
        </h1>
        <p className="login-subtitle font-body">Tap your RFID band or enter your UID</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input 
            type="text" 
            className="input font-mono" 
            placeholder="Enter RFID UID (e.g. AABBCCDD)" 
            value={rfidUid}
            onChange={(e) => setRfidUid(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Authenticating...' : 'Login with RFID'}
          </button>
        </form>
        
        <div className="login-footer font-mono">
          New to fitSense? <span>Register at the front desk</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
