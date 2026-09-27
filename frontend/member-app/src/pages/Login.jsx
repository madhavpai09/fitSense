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
        <span className="login-rfid-icon">📡</span>
        <h1 className="login-logo font-display">
          NEXUS<span className="login-logo-dot"></span>
        </h1>
        <p className="login-subtitle font-body">Tap your RFID card or enter your UID</p>
        
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
          New to Nexus? <span>Register at the front desk</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
