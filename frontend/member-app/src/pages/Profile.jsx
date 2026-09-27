import React, { useState, useEffect } from 'react';
import { getMemberData, fetchApi } from '../api';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const member = getMemberData();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await fetchApi(`/members/${member.id}`);
        setProfile(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProfile();
  }, [member.id]);

  if (!profile) return (
    <div className="flex items-center justify-center" style={{ minHeight: '300px' }}>
      <div className="text-secondary font-mono">Loading profile...</div>
    </div>
  );

  const renderStars = (level) => {
    return Array(5).fill(0).map((_, i) => (
      <span key={i} className="star" style={{ color: i < level ? 'var(--signal)' : 'var(--ink-700)' }}>★</span>
    ));
  };

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div className="card flex items-center gap-6" style={{ padding: '2rem' }}>
        <div className="avatar">
          {profile.name?.charAt(0) || 'M'}
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-display font-black" style={{ letterSpacing: '-0.5px' }}>{profile.name}</h1>
          <div className="flex items-center gap-2 text-sm">
            <span className="label text-mist-500">RFID:</span>
            <code style={{ 
              background: 'rgba(255,255,255,0.04)', 
              padding: '0.15rem 0.5rem', 
              borderRadius: '4px',
              fontSize: '0.8rem',
              color: 'var(--signal)',
              fontFamily: 'JetBrains Mono'
            }}>
              {profile.rfid_uid}
            </code>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="label text-mist-500">FITNESS LEVEL:</span>
            <div className="star-rating">{renderStars(profile.fitness_level)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="card text-center" style={{ padding: '1.5rem' }}>
          <div className="text-3xl font-display font-black text-signal">{profile.total_sessions}</div>
          <div className="label mt-2">TOTAL SESSIONS</div>
        </div>
        <div className="card text-center" style={{ padding: '1.5rem' }}>
          <div className="text-3xl font-display font-black text-ember">{profile.total_calories_burned}</div>
          <div className="label mt-2">CALORIES BURNED</div>
        </div>
        <div className="card text-center" style={{ padding: '1.5rem' }}>
          <div className="text-3xl font-display font-black text-warning">{profile.avg_session_duration}</div>
          <div className="label mt-2">AVG DURATION (MIN)</div>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-display font-bold text-signal">Account Settings</h2>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="label">NAME</label>
            <input type="text" className="input font-mono" defaultValue={profile.name} disabled />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label">EMAIL</label>
            <input type="email" className="input font-mono" defaultValue={profile.email || ''} placeholder="MEMBER@EXAMPLE.COM" disabled />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
