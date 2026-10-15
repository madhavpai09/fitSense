import React, { useState, useEffect, useRef } from 'react';
import { getMemberData, fetchApi } from '../api';
import FoodSearch from '../components/FoodSearch';
import NutritionForm from '../components/NutritionForm';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MEAL_SLOTS = [
  { id: 'Breakfast', label: 'Breakfast', icon: '🌅', subtitle: 'Start your morning with protein & complex carbs' },
  { id: 'Lunch', label: 'Lunch', icon: '☀️', subtitle: 'Refuel your midday energy' },
  { id: 'Snacks', label: 'Snacks', icon: '☕', subtitle: 'Pre/post workout fuel & healthy bites' },
  { id: 'Dinner', label: 'Dinner', icon: '🌙', subtitle: 'Light, nutrient-dense recovery meal' },
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
            Search food items, log your daily meals, and stay in your calorie target — HealthifyMe style
          </p>
        </div>
        <div className="status-badge active" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
          📅 TODAY • {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Top HealthifyMe Calorie & Macro Target Progress Card */}
      <div className="card" style={{ background: 'rgba(10, 10, 24, 0.75)', borderColor: 'rgba(232, 255, 71, 0.15)' }}>
        <div className="grid grid-cols-2 gap-8" style={{ alignItems: 'center' }}>
          {/* Calorie Consumed vs Target Hero */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-baseline">
              <span className="label">DAILY CALORIE BUDGET</span>
              <span className="font-mono text-xs text-muted">
                {caloriePercent}% of goal
              </span>
            </div>

            <div className="flex items-center justify-between" style={{ padding: '0.5rem 0' }}>
              <div className="calorie-hero-stat">
                <span className="text-xs font-mono text-muted mb-1">CONSUMED</span>
                <span className="text-4xl font-display font-black text-signal">{consumedCals}</span>
                <span className="text-xs font-mono text-muted">kcal</span>
              </div>

              <div style={{ width: '1px', height: '60px', background: 'var(--card-border)' }} />

              <div className="calorie-hero-stat">
                <span className="text-xs font-mono text-muted mb-1">REMAINING</span>
                <span className="text-4xl font-display font-black" style={{ color: remainingCals > 0 ? 'var(--mist-100)' : 'var(--ember)' }}>
                  {remainingCals}
                </span>
                <span className="text-xs font-mono text-muted">kcal left</span>
              </div>

              <div style={{ width: '1px', height: '60px', background: 'var(--card-border)' }} />

              <div className="calorie-hero-stat">
                <span className="text-xs font-mono text-muted mb-1">DAILY TARGET</span>
                <span className="text-4xl font-display font-black text-muted">{targetCals}</span>
                <span className="text-xs font-mono text-muted">kcal</span>
              </div>
            </div>

            {/* Progress Track */}
            <div className="macro-bar-track" style={{ height: '10px', borderRadius: '5px' }}>
              <div
                className="macro-bar-fill"
                style={{
                  width: `${caloriePercent}%`,
                  background: consumedCals > targetCals
                    ? 'var(--ember)'
                    : 'linear-gradient(90deg, #b8cc38 0%, #e8ff47 100%)'
                }}
              />
            </div>
          </div>

          {/* 4 Macro Target Bars */}
          <div className="flex flex-col gap-3" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '2rem' }}>
            <span className="label mb-1">MACRONUTRIENT TARGETS</span>
            <MacroProgressRow
              label="PROTEIN"
              current={consumedProtein}
              target={targetProtein}
              color="var(--signal)"
              icon="🥩"
            />
            <MacroProgressRow
              label="CARBS"
              current={consumedCarbs}
              target={targetCarbs}
              color="var(--warning)"
              icon="🍞"
            />
            <MacroProgressRow
              label="FATS"
              current={consumedFats}
              target={targetFats}
              color="var(--ember)"
              icon="🥑"
            />
            <MacroProgressRow
              label="FIBER"
              current={consumedFiber}
              target={targetFiber}
              color="#38bdf8"
              icon="🥦"
            />
          </div>
        </div>
      </div>

      {/* Food Search & Portion Customizer Card */}
      <div className="card" ref={searchSectionRef}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '1.25rem' }}>🍽️</span>
            <h2 className="text-xl font-display font-bold text-signal">
              {selectedFood ? 'Customize Portion & Log Meal' : 'Add Food to Your Diary'}
            </h2>
          </div>
          {!selectedFood && (
            <span className="label">INSTANT PULL-DOWN RECOMMENDATIONS</span>
          )}
        </div>

        {!selectedFood ? (
          <div className="flex flex-col gap-3">
            <FoodSearch onSelect={handleFoodSelect} />
            <div className="flex items-center gap-2 text-xs text-muted font-mono mt-1">
              <span>💡 Tip: Type any letter (e.g. "c", "r", "e") to pull down instant suggestions.</span>
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

      {/* HealthifyMe Daily Meal Diary Timeline */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-mist-100 flex items-center gap-2">
            <span>📋</span> Daily Meal Diary
          </h2>
          <span className="text-xs text-muted font-mono">
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
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '1.4rem' }}>{slot.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-lg text-mist-100">{slot.label}</h3>
                        <span className="font-mono font-bold text-signal text-sm">
                          {slotCalories} kcal
                        </span>
                      </div>
                      {items.length > 0 && (
                        <div className="macro-mini-pill mt-1">
                          <span style={{ color: 'var(--signal)' }}>P: {slotProtein}g</span> •{' '}
                          <span style={{ color: 'var(--warning)' }}>C: {slotCarbs}g</span> •{' '}
                          <span style={{ color: 'var(--ember)' }}>F: {slotFats}g</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn"
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
                          <div className="flex flex-col gap-1" style={{ maxWidth: '65%' }}>
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
                              <div className="font-mono font-bold text-signal text-sm">
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
            <span style={{ fontSize: '1.25rem' }}>📊</span>
            <h2 className="text-xl font-display font-bold text-signal">7-Day Calorie Intake Trend</h2>
          </div>
          <span className="text-xs font-mono text-muted">Daily Target: {targetCals} kcal</span>
        </div>

        <div style={{ height: 260, width: '100%' }}>
          <ResponsiveContainer>
            <BarChart data={weeklyHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                stroke="var(--mist-700)"
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
              <YAxis stroke="var(--mist-700)" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--ink-950)',
                  borderColor: 'var(--signal)',
                  borderRadius: '6px',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                }}
                formatter={(val) => [`${val} kcal`, 'Calories Consumed']}
              />
              <Bar dataKey="total_calories" fill="var(--signal)" radius={[6, 6, 0, 0]} />
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
        <span className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--mist-100)' }}>
          <span>{icon}</span> {label}
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
