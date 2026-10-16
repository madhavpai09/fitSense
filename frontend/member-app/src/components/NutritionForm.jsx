import React, { useState, useEffect } from 'react';
import { fetchApi, getMemberData } from '../api';

const MEAL_OPTIONS = [
  {
    id: 'Breakfast',
    label: 'Breakfast',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4M20 12h2M19.07 4.93l-2.83 2.83"/>
        <path d="M2 18h20"/>
        <path d="M4 18a8 8 0 0 1 16 0"/>
      </svg>
    )
  },
  {
    id: 'Lunch',
    label: 'Lunch',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
      </svg>
    )
  },
  {
    id: 'Snacks',
    label: 'Snacks',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
      </svg>
    )
  },
];

const getDefaultMeal = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'Breakfast';
  if (hour >= 11 && hour < 16) return 'Lunch';
  if (hour >= 16 && hour < 19) return 'Snacks';
  return 'Dinner';
};

const NutritionForm = ({ food, initialMeal, onLogged, onCancel }) => {
  const member = getMemberData();
  const [mealType, setMealType] = useState(initialMeal || getDefaultMeal());
  
  const baseWeight = food.serving_weight_g || 100;
  const [multiplier, setMultiplier] = useState(1);
  const [servingGrams, setServingGrams] = useState(baseWeight);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // When food changes, reset
  useEffect(() => {
    const base = food.serving_weight_g || 100;
    setMultiplier(1);
    setServingGrams(base);
    if (initialMeal) setMealType(initialMeal);
  }, [food, initialMeal]);

  const handleMultiplierChange = (newMult) => {
    const validMult = Math.max(0.25, Math.round(newMult * 100) / 100);
    setMultiplier(validMult);
    setServingGrams(Math.round(baseWeight * validMult));
  };

  const handleGramsChange = (grams) => {
    const validGrams = Math.max(1, grams);
    setServingGrams(validGrams);
    setMultiplier(Math.round((validGrams / baseWeight) * 100) / 100);
  };

  // Calculations
  const factor = servingGrams / 100;
  const calsPer100 = food.calories_per_100g || food.calories || 0;
  const proteinPer100 = food.protein_per_100g || food.protein_g || 0;
  const carbsPer100 = food.carbs_per_100g || food.carbs_g || 0;
  const fatsPer100 = food.fats_per_100g || food.fats_g || 0;
  const fiberPer100 = food.fiber_per_100g || food.fiber_g || 0;

  const totalCalories = Math.round(calsPer100 * factor);
  const totalProtein = Number((proteinPer100 * factor).toFixed(1));
  const totalCarbs = Number((carbsPer100 * factor).toFixed(1));
  const totalFats = Number((fatsPer100 * factor).toFixed(1));
  const totalFiber = Number((fiberPer100 * factor).toFixed(1));

  const handleLog = async () => {
    if (!member || !member.id) {
      setError('Member session not found. Please log in.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const servingDesc = food.serving_unit
      ? `${multiplier !== 1 ? `${multiplier}x ` : ''}${food.serving_unit} (${servingGrams}g)`
      : `${servingGrams}g`;

    try {
      await fetchApi('/nutrition/log', {
        method: 'POST',
        body: JSON.stringify({
          member_id: member.id,
          food_name: food.name,
          serving_size: servingDesc,
          calories: totalCalories,
          protein_g: totalProtein,
          carbs_g: totalCarbs,
          fats_g: totalFats,
          fiber_g: totalFiber,
          meal_type: mealType
        })
      });
      onLogged();
    } catch (err) {
      console.error('Failed to log food:', err);
      setError(err.message || 'Failed to save food log');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Food Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-bold text-xl text-mist-100">{food.name}</h3>
            {food.category && <span className="food-category-pill">{food.category}</span>}
          </div>
          <p className="text-xs text-muted font-mono">
            Standard: {food.serving_unit || `${baseWeight}g`} • {calsPer100} kcal / 100g
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            className="search-clear-btn"
            style={{ position: 'static' }}
            onClick={onCancel}
            title="Cancel"
          >
            ✕
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* HealthifyMe Meal Slot Selector */}
      <div className="flex flex-col gap-2">
        <label className="label">1. SELECT MEAL CATEGORY</label>
        <div className="meal-selector-grid">
          {MEAL_OPTIONS.map((slot) => (
            <button
              key={slot.id}
              type="button"
              className={`meal-select-btn ${mealType === slot.id ? 'active' : ''}`}
              onClick={() => setMealType(slot.id)}
            >
              <span style={{ fontSize: '1.25rem' }}>{slot.icon}</span>
              <span>{slot.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Serving / Quantity Controls */}
      <div className="flex flex-col gap-3">
        <label className="label">2. PORTION SIZE & QUANTITY</label>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-muted">Servings:</span>
            <div className="stepper-container">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleMultiplierChange(multiplier - 0.5)}
              >
                −
              </button>
              <input
                type="number"
                step="0.25"
                min="0.25"
                className="stepper-input"
                value={multiplier}
                onChange={(e) => handleMultiplierChange(parseFloat(e.target.value) || 1)}
              />
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleMultiplierChange(multiplier + 0.5)}
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-muted">Weight:</span>
            <div className="stepper-container">
              <input
                type="number"
                step="10"
                min="1"
                className="stepper-input"
                style={{ width: '85px' }}
                value={servingGrams}
                onChange={(e) => handleGramsChange(parseInt(e.target.value, 10) || baseWeight)}
              />
              <span className="text-xs text-muted font-mono" style={{ paddingRight: '6px' }}>g</span>
            </div>
          </div>
        </div>

        {/* Quick Chips */}
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <span className="text-xs text-muted font-mono">Quick:</span>
          {[0.5, 1.0, 1.5, 2.0].map((m) => (
            <button
              key={m}
              type="button"
              className={`portion-chip ${multiplier === m ? 'active' : ''}`}
              onClick={() => handleMultiplierChange(m)}
            >
              {m}x Serving
            </button>
          ))}
          {[100, 150, 200].map((g) => (
            <button
              key={g}
              type="button"
              className={`portion-chip ${servingGrams === g ? 'active' : ''}`}
              onClick={() => handleGramsChange(g)}
            >
              {g}g
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Macro Breakdown Cards */}
      <div className="flex flex-col gap-2">
        <label className="label">3. NUTRITIONAL BREAKDOWN</label>
        <div className="macro-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="macro-grid-item" style={{ borderColor: 'rgba(232, 255, 71, 0.25)' }}>
            <div className="font-display font-bold text-2xl text-signal">{totalCalories}</div>
            <div className="label mt-1">CALORIES</div>
          </div>
          <div className="macro-grid-item">
            <div className="font-display font-bold text-xl text-mist-100">{totalProtein}g</div>
            <div className="label mt-1" style={{ color: 'var(--signal)' }}>PROTEIN</div>
          </div>
          <div className="macro-grid-item">
            <div className="font-display font-bold text-xl text-warning">{totalCarbs}g</div>
            <div className="label mt-1 text-warning">CARBS</div>
          </div>
          <div className="macro-grid-item">
            <div className="font-display font-bold text-xl text-ember">{totalFats}g</div>
            <div className="label mt-1 text-ember">FATS</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-2">
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: '0 0 auto', padding: '0.75rem 1.25rem' }}
            onClick={onCancel}
          >
            ← CANCEL
          </button>
        )}
        <button
          type="button"
          className="btn flex-1"
          style={{
            padding: '0.85rem',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
          disabled={isSubmitting}
          onClick={handleLog}
        >
          {isSubmitting ? 'LOGGING...' : `+ LOG TO ${mealType.toUpperCase()} (${totalCalories} KCAL)`}
        </button>
      </div>
    </div>
  );
};

export default NutritionForm;
