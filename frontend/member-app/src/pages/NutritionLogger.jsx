import React, { useState, useEffect, useRef } from 'react';
import { getMemberData, fetchApi } from '../api';
import FoodSearch from '../components/FoodSearch';
import NutritionForm from '../components/NutritionForm';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MEAL_SLOTS = [
  {
    id: 'Breakfast',
    label: 'Breakfast',
    subtitle: 'High-protein breakfast to fuel morning metabolism',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
        <path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4M20 12h2M19.07 4.93l-2.83 2.83"/>
        <path d="M2 18h20"/>
        <path d="M4 18a8 8 0 0 1 16 0"/>
      </svg>
    )
  },
  {
    id: 'Lunch',
    label: 'Lunch',
    subtitle: 'Balanced carbs & protein for sustained afternoon energy',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0284c7' }}>
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
      </svg>
    )
  },
  {
    id: 'Snacks',
    label: 'Snacks',
    subtitle: 'Pre/post workout fuel & healthy bites',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ember)' }}>
        <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/>
        <line x1="6" x2="6" y1="2" y2="4"/>
        <line x1="10" x2="10" y1="2" y2="4"/>
        <line x1="14" x2="14" y1="2" y2="4"/>
      </svg>
    )
  },
  {
    id: 'Dinner',
    label: 'Dinner',
    subtitle: 'Light, nutrient-dense recovery meal before sleep',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#7c3aed' }}>
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
      </svg>
    )
  },
];

const NutritionLogger = () => {
  const member = getMemberData() || { id: 'default', name: 'Member' };
  const [selectedFood, setSelectedFood] = useState(null);
  const [activeMealTarget, setActiveMealTarget] = useState('Breakfast');
  const [todaySummary, setTodaySummary] = useState(null);
  const [weeklyHistory, setWeeklyHistory] = useState([]);
  const [isDeleting, setIsDeleting] = useState(null);
  const searchSectionRef = useRef(null);

  const fetchData = async () => {
    if (!member.id || member.id === 'default') return;
    try {
      const [today, history] = await Promise.all([
        fetchApi(`/nutrition/${member.id}/today`).catch(() => null),
        fetchApi(`/nutrition/${member.id}/history`).catch(() => [])
      ]);
      setTodaySummary(today);
      setWeeklyHistory(Array.isArray(history) ? history.reverse() : []);
    } catch (err) {
      console.error('Failed to load nutrition data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [member.id]);

  const handleFoodSelect = (food) => {
    setSelectedFood(food);
  };

  const handleLogged = () => {
    setSelectedFood(null);
    fetchData();
  };

  const handleQuickAddMeal = (mealId) => {
    setActiveMealTarget(mealId);
    setSelectedFood(null);
    if (searchSectionRef.current) {
      searchSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Remove this food item from your log?')) return;
    setIsDeleting(itemId);
    try {
      await fetchApi(`/nutrition/log/${itemId}`, { method: 'DELETE' });
      await fetchData();
    } catch (err) {
      console.error('Failed to delete logged food:', err);
      alert('Could not delete item. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  // Group logged items by meal_type
  const loggedItems = todaySummary?.items || [];
  const itemsByMeal = MEAL_SLOTS.reduce((acc, slot) => {
    acc[slot.id] = loggedItems.filter(
      (item) => (item.meal_type || 'Breakfast').toLowerCase() === slot.id.toLowerCase()
    );
    return acc;
  }, {});

  // Calculate stats
  const consumedCals = Math.round(todaySummary?.total_calories || 0);
  const targetCals = Math.round(todaySummary?.target_calories || 2200);
  const remainingCals = Math.max(0, targetCals - consumedCals);
  const caloriePercent = Math.min(100, Math.round((consumedCals / targetCals) * 100)) || 0;

  const consumedProtein = Number((todaySummary?.total_protein_g ?? todaySummary?.total_protein ?? 0).toFixed(1));
  const targetProtein = Math.round(todaySummary?.target_protein || 130);

  const consumedCarbs = Number((todaySummary?.total_carbs_g ?? todaySummary?.total_carbs ?? 0).toFixed(1));
  const targetCarbs = Math.round(todaySummary?.target_carbs || 240);

  const consumedFats = Number((todaySummary?.total_fats_g ?? todaySummary?.total_fats ?? 0).toFixed(1));
  const targetFats = Math.round(todaySummary?.target_fats || 65);

  const consumedFiber = Number((todaySummary?.total_fiber_g ?? 0).toFixed(1));
  const targetFiber = Math.round(todaySummary?.target_fiber || 30);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Nutrition Diary</h1>
          <p className="page-subtitle">
            Search food items, log your daily meals, and stay in your calorie target
          </p>
        </div>
        <div className="status-badge active" style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          TODAY • {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Top HealthifyMe Calorie & Macro Target Progress Card */}
      <div className="card">
        <div className="grid grid-cols-2 gap-8" style={{ alignItems: 'center' }}>
          {/* Calorie Consumed vs Target Hero */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-baseline">
              <span className="label">DAILY CALORIE BUDGET</span>
              <span className="font-mono text-xs text-muted font-semibold">
                {caloriePercent}% of daily budget
              </span>
            </div>

            <div className="flex items-center justify-between" style={{ padding: '0.5rem 0' }}>
              <div className="calorie-hero-stat">
                <span className="text-xs font-mono text-muted mb-1">CONSUMED</span>
                <span className="text-4xl font-display font-bold text-primary">{consumedCals}</span>
                <span className="text-xs font-mono text-muted">kcal</span>
              </div>

              <div style={{ width: '1px', height: '60px', background: 'var(--card-border)' }} />

              <div className="calorie-hero-stat">
                <span className="text-xs font-mono text-muted mb-1">REMAINING</span>
                <span className="text-4xl font-display font-bold" style={{ color: remainingCals > 0 ? 'var(--text-primary)' : 'var(--danger)' }}>
                  {remainingCals}
                </span>
                <span className="text-xs font-mono text-muted">kcal left</span>
              </div>

              <div style={{ width: '1px', height: '60px', background: 'var(--card-border)' }} />

              <div className="calorie-hero-stat">
                <span className="text-xs font-mono text-muted mb-1">TARGET</span>
                <span className="text-4xl font-display font-bold text-muted">{targetCals}</span>
                <span className="text-xs font-mono text-muted">kcal</span>
              </div>
            </div>

            {/* Progress Track */}
            <div className="macro-bar-track" style={{ height: '8px', borderRadius: '4px' }}>
              <div
                className="macro-bar-fill"
                style={{
                  width: `${caloriePercent}%`,
                  background: consumedCals > targetCals
                    ? 'var(--danger)'
                    : 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)'
                }}
              />
            </div>
          </div>

          {/* 4 Macro Target Bars */}
          <div className="flex flex-col gap-3" style={{ borderLeft: '1px solid var(--card-border)', paddingLeft: '2rem' }}>
            <span className="label mb-1">MACRONUTRIENT TARGETS</span>
            <MacroProgressRow
              label="PROTEIN"
              current={consumedProtein}
              target={targetProtein}
              color="var(--primary)"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              }
            />
            <MacroProgressRow
              label="CARBS"
              current={consumedCarbs}
              target={targetCarbs}
              color="var(--warning)"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--warning)' }}>
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v12M6 12h12"/>
                </svg>
              }
            />
            <MacroProgressRow
              label="FATS"
              current={consumedFats}
              target={targetFats}
              color="var(--ember)"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ember)' }}>
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
                </svg>
              }
            />
            <MacroProgressRow
              label="FIBER"
              current={consumedFiber}
              target={targetFiber}
              color="#0284c7"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0284c7' }}>
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                </svg>
              }
            />
          </div>
        </div>
      </div>

      {/* Food Search & Portion Customizer Card */}
      <div className="card" ref={searchSectionRef}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
              <line x1="6" y1="1" x2="6" y2="4"></line>
              <line x1="10" y1="1" x2="10" y2="4"></line>
              <line x1="14" y1="1" x2="14" y2="4"></line>
            </svg>
            <h2 className="text-xl font-display font-bold text-mist-100">
              {selectedFood ? 'Customize Portion & Log Meal' : 'Add a Meal to Your Diary'}
            </h2>
          </div>
          {!selectedFood && (
            <span className="label">INSTANT FOOD RECOMMENDATIONS</span>
          )}
        </div>

        {!selectedFood ? (
          <div className="flex flex-col gap-3">
            <FoodSearch onSelect={handleFoodSelect} />
            <div className="flex items-center gap-2 text-xs text-muted font-mono mt-1">
              <span>Type any letter (e.g. "c", "r", "e") to pull down instant suggestions.</span>
            </div>
          </div>
        ) : (
          <NutritionForm
            food={selectedFood}
            initialMeal={activeMealTarget}
            onLogged={handleLogged}
            onCancel={() => setSelectedFood(null)}
          />
        )}
      </div>

      {/* Daily Meal Diary Timeline */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-mist-100 flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            Daily Meal Diary
          </h2>
          <span className="text-xs text-muted font-mono font-medium">
            {loggedItems.length} {loggedItems.length === 1 ? 'item' : 'items'} logged today
          </span>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {MEAL_SLOTS.map((slot) => {
            const items = itemsByMeal[slot.id] || [];
            const slotCalories = Math.round(items.reduce((sum, item) => sum + (item.calories || 0), 0));
            const slotProtein = items.reduce((sum, item) => sum + (item.protein_g || 0), 0).toFixed(1);
            const slotCarbs = items.reduce((sum, item) => sum + (item.carbs_g || 0), 0).toFixed(1);
            const slotFats = items.reduce((sum, item) => sum + (item.fats_g || 0), 0).toFixed(1);

            return (
              <div key={slot.id} className="meal-section-card">
                {/* Meal Header */}
                <div className="meal-section-header">
                  <div className="flex items-center gap-3">
                    <div style={{ display: 'flex', alignItems: 'center' }}>{slot.icon}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-lg text-mist-100">{slot.label}</h3>
                        <span className="font-mono font-bold text-primary text-sm">
                          {slotCalories} kcal
                        </span>
                      </div>
                      {items.length > 0 && (
                        <div className="macro-mini-pill mt-1">
                          <span style={{ color: 'var(--primary)' }}>P: {slotProtein}g</span> •{' '}
                          <span style={{ color: 'var(--warning)' }}>C: {slotCarbs}g</span> •{' '}
                          <span style={{ color: 'var(--ember)' }}>F: {slotFats}g</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                    onClick={() => handleQuickAddMeal(slot.id)}
                  >
                    + ADD FOOD
                  </button>
                </div>

                {/* Logged Items List */}
                {items.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {items.map((item) => {
                      const timeStr = item.logged_at
                        ? new Date(item.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '';
                      return (
                        <div key={item.id} className="meal-logged-item">
                          <div className="flex flex-col gap-0.5" style={{ maxWidth: '65%' }}>
                            <span className="font-semibold text-mist-100 font-display">
                              {item.food_name}
                            </span>
                            <div className="text-xs text-muted font-mono flex items-center gap-2">
                              <span>{item.serving_size}</span>
                              {timeStr && <span>• {timeStr}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-mono font-bold text-primary text-sm">
                                {Math.round(item.calories)} kcal
                              </div>
                              <div className="macro-mini-pill">
                                <span>P: {item.protein_g}g</span> • <span>C: {item.carbs_g}g</span> • <span>F: {item.fats_g}g</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="delete-item-btn"
                              title="Delete food entry"
                              disabled={isDeleting === item.id}
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              {isDeleting === item.id ? '…' : '✕'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className="empty-meal-prompt"
                    onClick={() => handleQuickAddMeal(slot.id)}
                  >
                    <span>+ Log {slot.label} ({slot.subtitle})</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Intake History Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            <h2 className="text-xl font-display font-bold text-mist-100">7-Day Calorie Intake Trend</h2>
          </div>
          <span className="text-xs font-mono text-muted">Daily Target: {targetCals} kcal</span>
        </div>

        <div style={{ height: 260, width: '100%' }}>
          <ResponsiveContainer>
            <BarChart data={weeklyHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                tickFormatter={(val) => {
                  try {
                    const d = new Date(val);
                    return d.toLocaleDateString('en-US', { weekday: 'short' });
                  } catch {
                    return val;
                  }
                }}
              />
              <YAxis stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: 'var(--primary)',
                  borderRadius: '6px',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px',
                  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.1)'
                }}
                formatter={(val) => [`${val} kcal`, 'Calories Consumed']}
              />
              <Bar dataKey="total_calories" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const MacroProgressRow = ({ label, current, target, color, icon }) => {
  const percent = Math.min(100, Math.round((current / (target || 1)) * 100)) || 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center text-xs font-mono">
        <span className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
          {icon} {label}
        </span>
        <span className="text-muted">
          <strong style={{ color }}>{current}g</strong> / {target}g ({percent}%)
        </span>
      </div>
      <div className="macro-bar-track">
        <div
          className="macro-bar-fill"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export default NutritionLogger;
