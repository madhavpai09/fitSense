import React, { useState, useEffect } from 'react';
import { getMemberData, fetchApi } from '../api';
import FoodSearch from '../components/FoodSearch';
import NutritionForm from '../components/NutritionForm';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const NutritionLogger = () => {
  const member = getMemberData();
  const [selectedFood, setSelectedFood] = useState(null);
  const [todaySummary, setTodaySummary] = useState(null);
  const [weeklyHistory, setWeeklyHistory] = useState([]);

  const fetchData = async () => {
    try {
      const [today, history] = await Promise.all([
        fetchApi(`/nutrition/${member.id}/today`),
        fetchApi(`/nutrition/${member.id}/history`)
      ]);
      setTodaySummary(today);
      setWeeklyHistory(history);
    } catch (err) {
      console.error(err);
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Nutrition Logger</h1>
        <p className="page-subtitle">Track your daily intake and hit your macro targets</p>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-display font-bold text-signal">Log Food</h2>
            </div>
            {!selectedFood ? (
              <FoodSearch onSelect={handleFoodSelect} />
            ) : (
              <div>
                <button 
                  className="label mb-4 flex items-center gap-1 cursor-pointer hover:text-mist-100 transition-colors" 
                  onClick={() => setSelectedFood(null)}
                  style={{ background: 'none', border: 'none' }}
                >
                  ← BACK TO SEARCH
                </button>
                <NutritionForm food={selectedFood} onLogged={handleLogged} />
              </div>
            )}
          </div>
          
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-display font-bold text-signal">Weekly Calorie History</h2>
            </div>
            <div style={{ height: 250, width: '100%' }}>
              <ResponsiveContainer>
                <BarChart data={weeklyHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" stroke="var(--mist-700)" tick={{ fontSize: 12, fontFamily: 'JetBrains Mono' }} />
                  <YAxis stroke="var(--mist-700)" tick={{ fontSize: 12, fontFamily: 'JetBrains Mono' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--ink-950)', 
                      borderColor: 'var(--signal)',
                      borderRadius: '4px',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '12px'
                    }} 
                  />
                  <Bar dataKey="total_calories" fill="var(--signal)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-display font-bold text-signal">Today's Summary</h2>
          </div>
          {todaySummary ? (
            <>
              <div className="flex justify-center items-center gap-8" style={{ padding: '1rem 0' }}>
                <div className="text-center">
                  <div className="label mb-2">CONSUMED</div>
                  <div className="text-3xl font-display font-black text-ember">{todaySummary.total_calories}</div>
                  <div className="text-xs text-muted font-mono mt-1">kcal</div>
                </div>
                <div style={{ width: '1px', height: '50px', background: 'var(--card-border)' }} />
                <div className="text-center">
                  <div className="label mb-2">TARGET</div>
                  <div className="text-3xl font-display font-black text-signal">{todaySummary.target_calories}</div>
                  <div className="text-xs text-muted font-mono mt-1">kcal</div>
                </div>
              </div>

              <div className="flex flex-col gap-4 mt-2">
                <MacroBar label="PROTEIN" current={todaySummary.total_protein} target={todaySummary.target_protein} color="var(--signal)" />
                <MacroBar label="CARBS" current={todaySummary.total_carbs} target={todaySummary.target_carbs} color="var(--warning)" />
                <MacroBar label="FATS" current={todaySummary.total_fats} target={todaySummary.target_fats} color="var(--ember)" />
              </div>
            </>
          ) : (
            <div className="text-secondary font-mono" style={{ padding: '2rem 0', textAlign: 'center' }}>
              No meals logged today. Start logging to see your summary.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MacroBar = ({ label, current, target, color }) => {
  const percent = Math.min((current / target) * 100, 100) || 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center text-sm font-mono">
        <span className="font-semibold text-signal">{label}</span>
        <span className="text-muted">{current}G / {target}G</span>
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
