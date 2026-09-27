import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WorkoutPlan from './pages/WorkoutPlan';
import NutritionLogger from './pages/NutritionLogger';
import SessionHistory from './pages/SessionHistory';
import Profile from './pages/Profile';
import { getMemberData } from './api';

const ProtectedRoute = ({ children }) => {
  const member = getMemberData();
  if (!member) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/plan" element={<ProtectedRoute><WorkoutPlan /></ProtectedRoute>} />
        <Route path="/nutrition" element={<ProtectedRoute><NutritionLogger /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><SessionHistory /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
