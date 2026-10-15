import React, { useState, useEffect, useRef } from 'react';
import { fetchApi } from '../api';

const FoodSearch = ({ onSelect, autoFocus = false }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch foods as the user types (or quick picks when empty)
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const trimmed = query.trim();
        const url = trimmed
          ? `/nutrition/foods?q=${encodeURIComponent(trimmed)}`
          : `/nutrition/foods?q=`;
        const data = await fetchApi(url);
        if (active) {
          if (Array.isArray(data)) {
            setResults(data);
          } else if (typeof data === 'object') {
            // Fallback for legacy dict format
            const list = Object.entries(data).map(([key, val]) => ({
              id: key,
              name: key.charAt(0).toUpperCase() + key.slice(1),
              category: 'General',
              calories_per_100g: val.calories,
              protein_per_100g: val.protein_g,
              carbs_per_100g: val.carbs_g,
              fats_per_100g: val.fats_g,
              fiber_per_100g: val.fiber_g || 0,
              serving_unit: '100g',
              serving_weight_g: 100
            }));
            setResults(list);
          }
        }
      } catch (err) {
        console.error('Error fetching food suggestions:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 120); // 120ms debounce for ultra-responsive typing

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleChoose(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleChoose = (food) => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(-1);
    onSelect(food);
  };

  const handleClear = () => {
    setQuery('');
    setSelectedIndex(-1);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="search-wrapper" ref={searchContainerRef}>
      <div className="search-input-container">
        <span className="search-icon-left">🔍</span>
        <input
          ref={inputRef}
          type="text"
          className="input search-input-styled font-mono"
          placeholder="Search food by letter (e.g. Chicken, Roti, Rice, Egg, Oats)..."
          value={query}
          autoFocus={autoFocus}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={handleClear}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div className="food-dropdown">
          <div className="food-dropdown-header">
            <span>
              {query.trim()
                ? `SUGGESTIONS FOR "${query.toUpperCase()}"`
                : '🔥 POPULAR HEALTHIFYME FOODS'}
            </span>
            {isLoading && <span style={{ color: 'var(--mist-700)' }}>Searching...</span>}
          </div>

          {results.length === 0 && !isLoading ? (
            <div
              style={{
                padding: '1.25rem',
                textAlign: 'center',
                color: 'var(--mist-700)',
                fontSize: '0.85rem',
                fontFamily: 'JetBrains Mono',
              }}
            >
              No foods matching "{query}". Try "Chicken", "Roti", "Egg", or "Rice".
            </div>
          ) : (
            results.map((food, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={food.id || idx}
                  className={`food-dropdown-item ${isSelected ? 'focused' : ''}`}
                  onClick={() => handleChoose(food)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="flex flex-col gap-1" style={{ maxWidth: '70%' }}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-mist-100 font-display text-base">
                        {food.name}
                      </span>
                      {food.category && (
                        <span className="food-category-pill">{food.category}</span>
                      )}
                    </div>
                    <div className="text-xs text-mist-700 font-mono flex items-center gap-2">
                      <span>Serving: {food.serving_unit || `${food.serving_weight_g || 100}g`}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold font-mono text-signal text-sm">
                        {Math.round(food.calories_per_100g || food.calories || 0)} kcal
                      </div>
                      <div className="macro-mini-pill">
                        <span style={{ color: 'var(--signal)' }}>P: {food.protein_per_100g || food.protein_g || 0}g</span> •{' '}
                        <span style={{ color: 'var(--warning)' }}>C: {food.carbs_per_100g || food.carbs_g || 0}g</span> •{' '}
                        <span style={{ color: 'var(--ember)' }}>F: {food.fats_per_100g || food.fats_g || 0}g</span>
                      </div>
                    </div>
                    <button
                      className="btn"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        letterSpacing: '0.05em',
                        borderRadius: '6px',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChoose(food);
                      }}
                    >
                      + ADD
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default FoodSearch;
