import React, { useState } from 'react';
import { fetchApi, getMemberData } from '../api';

const NutritionForm = ({ food, onLogged }) => {
  const member = getMemberData();
  const [servingSize, setServingSize] = useState(100);

  const factor = servingSize / 100;
  const calories = Math.round(food.calories_per_100g * factor);
  const protein = (food.protein_per_100g * factor).toFixed(1);
  const carbs = (food.carbs_per_100g * factor).toFixed(1);
  const fats = (food.fats_per_100g * factor).toFixed(1);

  const handleLog = async () => {
    try {
      await fetchApi('/nutrition/log', {
        method: 'POST',
        body: JSON.stringify({
          member_id: member.id,
          food_id: food.id,
          serving_size_g: servingSize
        })
      });
      onLogged();
    } catch (err) {
      console.error('Failed to log nutrition', err);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-display font-bold text-lg text-signal">{food.name}</h3>
      
      <div className="flex items-center gap-3">
        <label className="label">SERVING (G):</label>
        <input 
          type="number" 
          className="input font-mono" 
          style={{ width: '100px' }}
          value={servingSize}
          onChange={(e) => setServingSize(Number(e.target.value))}
          min="1"
        />
      </div>
      
      <div className="macro-grid">
        <div className="macro-grid-item">
          <div className="font-display font-bold text-lg text-signal">{calories}</div>
          <div className="label mt-1">KCAL</div>
        </div>
        <div className="macro-grid-item">
          <div className="font-display font-bold text-lg text-mist-100">{protein}g</div>
          <div className="label mt-1 text-mist-500">PROTEIN</div>
        </div>
        <div className="macro-grid-item">
          <div className="font-display font-bold text-lg text-warning">{carbs}g</div>
          <div className="label mt-1 text-mist-500">CARBS</div>
        </div>
        <div className="macro-grid-item">
          <div className="font-display font-bold text-lg text-ember">{fats}g</div>
          <div className="label mt-1 text-mist-500">FATS</div>
        </div>
      </div>
      
      <button className="btn mt-2" onClick={handleLog} style={{ width: '100%' }}>
        LOG FOOD
      </button>
    </div>
  );
};

export default NutritionForm;
