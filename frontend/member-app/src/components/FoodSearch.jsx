import React, { useState } from 'react';
import { fetchApi } from '../api';

const FoodSearch = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    try {
      const data = await fetchApi(`/nutrition/foods?q=${query}`);
      setResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input 
          type="text" 
          className="input flex-1 font-mono" 
          placeholder="SEARCH FOOD..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn">SEARCH</button>
      </form>
      
      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((food) => (
            <div 
              key={food.id} 
              className="food-item"
              onClick={() => onSelect(food)}
            >
              <div>
                <div className="font-semibold font-display tracking-wide">{food.name}</div>
                <div className="text-xs text-muted font-mono">{food.calories_per_100g} kcal / 100g</div>
              </div>
              <button className="btn" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>SELECT</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FoodSearch;
