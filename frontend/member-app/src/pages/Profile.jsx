import React, { useState, useEffect } from 'react';
import { getMemberData, fetchApi } from '../api';

const FITNESS_GOALS = [
  {
    id: 'Fat Loss & Endurance',
    label: 'Fat Loss & Endurance',
    desc: 'Burn calories & boost aerobic stamina',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ember)' }}>
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
      </svg>
    )
  },
  {
    id: 'Muscle Hypertrophy',
    label: 'Muscle Building',
    desc: 'Hypertrophy, strength & muscle density',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
        <path d="m6.5 6.5 11 11"/>
        <path d="m21 21-1-1"/>
        <path d="m3 3 1 1"/>
        <path d="m18 22 4-4"/>
        <path d="m2 6 4-4"/>
        <path d="m3 10 7-7"/>
        <path d="m14 21 7-7"/>
      </svg>
    )
  },
  {
    id: 'Cardio Conditioning',
    label: 'Cardio & Heart Health',
    desc: 'Elevate VO2 max & cardiac capacity',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--danger)' }}>
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        <path d="M12 5v14"/>
      </svg>
    )
  },
  {
    id: 'Maintenance & Health',
    label: 'Maintenance & Wellness',
    desc: 'Sustain functional fitness & joint health',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--success)' }}>
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
        <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
        <path d="M7 21h10"/>
        <path d="M12 3v18"/>
        <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
      </svg>
    )
  },
  {
    id: 'Strength & Performance',
    label: 'Athletic Performance',
    desc: 'Power output, speed & acceleration',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#8b5cf6' }}>
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
    )
  }
];

const FITNESS_LEVEL_LABELS = {
  1: 'Beginner (Starting journey)',
  2: 'Novice (Regular light training)',
  3: 'Intermediate (Consistent sessions)',
  4: 'Advanced (High intensity athlete)',
  5: 'Elite (Peak performance)'
};

const Profile = () => {
  const member = getMemberData() || {};
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState('not_specified');
  const [heightCm, setHeightCm] = useState(175);
  const [weightKg, setWeightKg] = useState(70);
  const [targetWeightKg, setTargetWeightKg] = useState(65);
  const [strideLengthCm, setStrideLengthCm] = useState(72.5);
  const [fitnessGoal, setFitnessGoal] = useState('Fat Loss & Endurance');
  const [fitnessLevel, setFitnessLevel] = useState(3);
  const [stepTarget, setStepTarget] = useState(10000);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!member.id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await fetchApi(`/members/${member.id}`);
        setProfile(data);

        setName(data.name || '');
        setEmail(data.email || '');
        setAge(data.age || 25);
        setGender(data.gender || 'not_specified');
        setHeightCm(data.height_cm || 175);
        setWeightKg(data.weight_kg || 70);
        setTargetWeightKg(data.target_weight_kg || (data.weight_kg ? data.weight_kg - 5 : 65));
        setStrideLengthCm(data.stride_length_cm || (data.height_cm ? Number((data.height_cm * 0.415).toFixed(1)) : 72.5));
        setFitnessGoal(data.fitness_goal || 'Fat Loss & Endurance');
        setFitnessLevel(data.fitness_level_score || data.fitness_level || 3);
        setStepTarget(data.daily_step_target || 10000);
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('Failed to fetch profile details.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [member.id]);

  // Auto-calculate stride length from height and gender
  const handleAutoEstimateStride = () => {
    const height = parseFloat(heightCm) || 175;
    const ratio = gender === 'female' ? 0.413 : 0.415;
    const estimated = Number((height * ratio).toFixed(1));
    setStrideLengthCm(estimated);
  };

  // Derived biometrics calculations
  const heightM = (parseFloat(heightCm) || 175) / 100;
  const curWeight = parseFloat(weightKg) || 70;
  const tarWeight = parseFloat(targetWeightKg) || 65;
  const bmi = heightM > 0 ? (curWeight / (heightM * heightM)).toFixed(1) : '22.0';

  const getBmiCategory = (val) => {
    const num = parseFloat(val);
    if (num < 18.5) return { label: 'Underweight', color: 'var(--warning)' };
    if (num < 25.0) return { label: 'Normal Weight', color: 'var(--success)' };
    if (num < 30.0) return { label: 'Overweight', color: 'var(--warning)' };
    return { label: 'Obese', color: 'var(--danger)' };
  };

  const bmiCat = getBmiCategory(bmi);

  // Basal Metabolic Rate (BMR) - Mifflin-St Jeor Formula
  const userAge = parseInt(age, 10) || 25;
  let bmr = Math.round(10 * curWeight + 6.25 * (heightM * 100) - 5 * userAge);
  if (gender === 'female') bmr -= 161;
  else if (gender === 'male') bmr += 5;
  else bmr -= 78;

  // TDEE with moderate gym activity multiplier (1.45)
  const tdee = Math.round(bmr * 1.45);
  const weightDiff = Number((tarWeight - curWeight).toFixed(1));

  // Save changes
  const handleSave = async (e) => {
    e.preventDefault();
    if (!member.id) return;
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    const updatePayload = {
      name,
      email,
      age: parseInt(age, 10),
      gender,
      height_cm: parseFloat(heightCm),
      weight_kg: parseFloat(weightKg),
      target_weight_kg: parseFloat(targetWeightKg),
      stride_length_cm: parseFloat(strideLengthCm),
      fitness_goal: fitnessGoal,
      fitness_level_score: parseInt(fitnessLevel, 10),
      daily_step_target: parseInt(stepTarget, 10)
    };

    try {
      const updated = await fetchApi(`/members/${member.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload)
      });
      setProfile(updated);
      setSaveSuccess(true);

      const localData = getMemberData() || {};
      localStorage.setItem('memberData', JSON.stringify({ ...localData, ...updated }));

      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to update member profile:', err);
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '350px' }}>
        <div className="text-secondary font-mono flex items-center gap-2">
          <span className="pulse-dot active" /> Loading member profile & sensor calibration...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8" style={{ maxWidth: '880px', margin: '0 auto' }}>
      {/* Page Title */}
      <div>
        <h1 className="page-title">Member Profile & Biometrics</h1>
        <p className="page-subtitle">
          Manage your physical measurements, stride length calibration for vibration sensors, and fitness targets
        </p>
      </div>

      {saveSuccess && (
        <div className="card" style={{ borderColor: '#bbf7d0', background: '#f0fdf4' }}>
          <div className="flex items-center gap-2 text-success font-semibold text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
            Profile and vibration sensor parameters saved successfully!
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {/* Member Hero Header Card */}
      <div className="card flex items-center justify-between flex-wrap gap-6" style={{ padding: '2rem' }}>
        <div className="flex items-center gap-6">
          <div className="avatar">
            {name ? name.charAt(0).toUpperCase() : 'M'}
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-3xl font-display font-bold text-mist-100" style={{ letterSpacing: '-0.5px' }}>
              {name || 'Member'}
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-mono text-muted">{email}</span>
              <span style={{ color: 'var(--card-border)' }}>•</span>
              <div className="flex items-center gap-1.5">
                <span className="label text-muted">RFID BAND:</span>
                <code
                  style={{
                    background: 'var(--primary-light)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.78rem',
                    color: 'var(--primary)',
                    fontFamily: 'JetBrains Mono',
                    border: '1px solid var(--primary-border)',
                    fontWeight: 600
                  }}
                >
                  {profile?.rfid_uid || 'AABBCCDD'}
                </code>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="label text-muted">FITNESS LEVEL:</span>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className="star cursor-pointer"
                    style={{ color: star <= fitnessLevel ? '#f59e0b' : '#cbd5e1' }}
                    onClick={() => setFitnessLevel(star)}
                    title={`Rate level ${star}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-xs font-mono text-muted ml-2">
                {FITNESS_LEVEL_LABELS[fitnessLevel] || ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 items-end">
          <div className="status-badge active">
            <span className="pulse-dot active" /> SENSOR LINKED
          </div>
          <span className="text-xs text-muted font-mono">
            Stride: {strideLengthCm} cm
          </span>
        </div>
      </div>

      {/* Lifetime Gym Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card text-center" style={{ padding: '1.25rem' }}>
          <div className="text-3xl font-display font-bold text-signal">{profile?.total_sessions ?? 0}</div>
          <div className="label mt-1">TOTAL SESSIONS</div>
        </div>
        <div className="card text-center" style={{ padding: '1.25rem' }}>
          <div className="text-3xl font-display font-bold text-ember">
            {profile?.total_calories_burned ? Math.round(profile.total_calories_burned) : 0}
          </div>
          <div className="label mt-1">TOTAL KCAL BURNED</div>
        </div>
        <div className="card text-center" style={{ padding: '1.25rem' }}>
          <div className="text-3xl font-display font-bold text-warning">
            {profile?.avg_session_duration ?? 0}
          </div>
          <div className="label mt-1">AVG DURATION (MIN)</div>
        </div>
        <div className="card text-center" style={{ padding: '1.25rem' }}>
          <div className="text-3xl font-display font-bold text-mist-100">
            {profile?.lifetime_distance_km ? profile.lifetime_distance_km.toFixed(1) : '0.0'}
          </div>
          <div className="label mt-1">TOTAL DISTANCE (KM)</div>
        </div>
      </div>

      {/* Vibration Sensor Explanation Callout with Sharp Icon */}
      <div className="vibration-info-banner">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }}>
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        <div className="flex flex-col gap-1 text-sm">
          <div className="font-semibold text-primary font-display text-base">
            Treadmill Vibration Calibration (MPU-6050 IMU)
          </div>
          <p className="text-mist-700 leading-relaxed text-xs">
            FitSense smart treadmills use an accelerometer mounted to the running deck to register impact vibrations from your foot strikes. 
            By providing your accurate <strong>Height</strong> and <strong>Stride Length</strong>, our vibration algorithms accurately derive your 
            cadence (steps/min) and running speed (<span className="font-mono text-primary font-semibold">speed = cadence × stride</span>) directly from deck vibration peaks!
          </p>
        </div>
      </div>

      {/* Main Profile & Biometric Edit Form */}
      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Section 1: Physical Measurements & Vibration Calibration */}
        <div className="card flex flex-col gap-5" style={{ padding: '1.75rem' }}>
          <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <h2 className="text-xl font-display font-bold text-mist-100 flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0l12.6 12.6z"/>
                <line x1="14.5" y1="12.5" x2="16" y2="11"/>
                <line x1="10.5" y1="8.5" x2="12" y2="7"/>
                <line x1="6.5" y1="4.5" x2="8" y2="3"/>
                <line x1="18.5" y1="16.5" x2="20" y2="15"/>
              </svg>
              Physical Biometrics & Stride Calibration
            </h2>
            <span className="label">VIBRATION METRICS</span>
          </div>

          <div className="grid grid-cols-3 gap-5">
            {/* Height */}
            <div className="flex flex-col gap-1.5">
              <label className="label">HEIGHT (CM)</label>
              <input
                type="number"
                step="0.5"
                min="100"
                max="250"
                className="input font-mono"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                required
              />
              <span className="text-xs text-muted font-mono">e.g. 175 cm (5'9")</span>
            </div>

            {/* Current Weight */}
            <div className="flex flex-col gap-1.5">
              <label className="label">CURRENT WEIGHT (KG)</label>
              <input
                type="number"
                step="0.1"
                min="30"
                max="300"
                className="input font-mono"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                required
              />
              <span className="text-xs text-muted font-mono">Used for calorie calculation</span>
            </div>

            {/* Target Weight */}
            <div className="flex flex-col gap-1.5">
              <label className="label">TARGET WEIGHT (KG)</label>
              <input
                type="number"
                step="0.1"
                min="30"
                max="300"
                className="input font-mono"
                value={targetWeightKg}
                onChange={(e) => setTargetWeightKg(e.target.value)}
                required
              />
              <span className="text-xs text-muted font-mono">
                {weightDiff !== 0
                  ? `${weightDiff > 0 ? `+${weightDiff}` : weightDiff} kg from current`
                  : 'Goal reached! 🎉'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-5">
            {/* Stride Length with Auto-Estimate Button */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="label">STRIDE LENGTH (CM)</label>
                <button
                  type="button"
                  className="auto-calc-btn"
                  onClick={handleAutoEstimateStride}
                  title="Estimate based on height & biomechanical ratio"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Auto-Calc
                </button>
              </div>
              <input
                type="number"
                step="0.5"
                min="40"
                max="140"
                className="input font-mono"
                value={strideLengthCm}
                onChange={(e) => setStrideLengthCm(e.target.value)}
                required
              />
              <span className="text-xs text-muted font-mono">Crucial for vibration speed calc</span>
            </div>

            {/* Age */}
            <div className="flex flex-col gap-1.5">
              <label className="label">AGE (YEARS)</label>
              <input
                type="number"
                min="14"
                max="100"
                className="input font-mono"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
              />
              <span className="text-xs text-muted font-mono">Used for heart rate zones</span>
            </div>

            {/* Gender */}
            <div className="flex flex-col gap-1.5">
              <label className="label">GENDER</label>
              <select
                className="input font-mono"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="not_specified">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Non-Binary / Other</option>
              </select>
              <span className="text-xs text-muted font-mono">Refines BMR & stride ratio</span>
            </div>
          </div>

          {/* Derived Real-Time Biometric Tiles */}
          <div className="grid grid-cols-4 gap-4 mt-2">
            <div className="biometric-metric-card">
              <div className="label mb-1">BODY MASS INDEX (BMI)</div>
              <div className="text-2xl font-display font-bold text-mist-100">{bmi}</div>
              <div className="text-xs font-mono font-semibold mt-1" style={{ color: bmiCat.color }}>
                {bmiCat.label}
              </div>
            </div>

            <div className="biometric-metric-card">
              <div className="label mb-1">BASAL METABOLIC RATE</div>
              <div className="text-2xl font-display font-bold text-primary">{bmr}</div>
              <div className="text-xs font-mono text-muted mt-1">kcal / day (rest)</div>
            </div>

            <div className="biometric-metric-card">
              <div className="label mb-1">DAILY ENERGY (TDEE)</div>
              <div className="text-2xl font-display font-bold text-ember">{tdee}</div>
              <div className="text-xs font-mono text-muted mt-1">kcal / day (active)</div>
            </div>

            <div className="biometric-metric-card">
              <div className="label mb-1">STEP CADENCE @ 8KM/H</div>
              <div className="text-2xl font-display font-bold text-warning">
                {strideLengthCm > 0 ? Math.round((8000 / 60) / (strideLengthCm / 100)) : 180}
              </div>
              <div className="text-xs font-mono text-muted mt-1">steps / min (vibration)</div>
            </div>
          </div>
        </div>

        {/* Section 2: Goals & Activity Targets */}
        <div className="card flex flex-col gap-5" style={{ padding: '1.75rem' }}>
          <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <h2 className="text-xl font-display font-bold text-mist-100 flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
              Fitness Goals & Activity Targets
            </h2>
            <span className="label">TARGET SETTINGS</span>
          </div>

          {/* Goal Selector Grid */}
          <div className="flex flex-col gap-2">
            <label className="label">PRIMARY FITNESS OBJECTIVE</label>
            <div className="goal-card-grid">
              {FITNESS_GOALS.map((g) => (
                <div
                  key={g.id}
                  className={`goal-pill-card ${fitnessGoal === g.id ? 'active' : ''}`}
                  onClick={() => setFitnessGoal(g.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {g.icon}
                  </div>
                  <div>
                    <div className="font-display font-bold text-sm text-mist-100">{g.label}</div>
                    <div className="text-xs text-muted font-mono">{g.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Step Target Slider & Input */}
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex justify-between items-center">
              <label className="label">DAILY STEP TARGET</label>
              <span className="font-mono font-bold text-primary text-sm">
                {parseInt(stepTarget, 10).toLocaleString()} steps
              </span>
            </div>
            <input
              type="range"
              min="3000"
              max="25000"
              step="500"
              value={stepTarget}
              onChange={(e) => setStepTarget(e.target.value)}
              style={{
                accentColor: 'var(--primary)',
                width: '100%',
                cursor: 'pointer'
              }}
            />
            <div className="flex justify-between text-xs text-muted font-mono">
              <span>3,000 (Light)</span>
              <span>10,000 (Recommended)</span>
              <span>25,000 (Athlete)</span>
            </div>
          </div>
        </div>

        {/* Section 3: Account Credentials */}
        <div className="card flex flex-col gap-4" style={{ padding: '1.75rem' }}>
          <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <h2 className="text-xl font-display font-bold text-mist-100 flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Account Information
            </h2>
            <span className="label">CREDENTIALS</span>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="label">FULL NAME</label>
              <input
                type="text"
                className="input font-mono"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="label">EMAIL ADDRESS</label>
              <input
                type="email"
                className="input font-mono"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-4 mt-2">
          <button
            type="submit"
            className="btn"
            disabled={saving}
            style={{
              padding: '0.85rem 2.5rem',
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            {saving ? 'SAVING PROFILE...' : 'SAVE PROFILE & SENSOR PARAMETERS'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
