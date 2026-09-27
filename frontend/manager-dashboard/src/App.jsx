import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import EquipmentOverview from './pages/EquipmentOverview';
import MaintenanceAlerts from './pages/MaintenanceAlerts';
import SessionAnalytics from './pages/SessionAnalytics';
import ActiveSessions from './pages/ActiveSessions';
import SimulatorPage from './pages/SimulatorPage';
import { useEffect, useState } from 'react';
import { fetchAlerts, fetchActiveSessions } from './api';

function App() {
  const [alertCount, setAlertCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    const updateCounts = async () => {
      const alerts = await fetchAlerts();
      const active = await fetchActiveSessions();
      setAlertCount(alerts?.length || 0);
      setActiveCount(active?.length || 0);
    };
    updateCounts();
    const interval = setInterval(updateCounts, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <div className="app-container">
        <Sidebar alertCount={alertCount} activeCount={activeCount} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/equipment" replace />} />
            <Route path="/equipment" element={<EquipmentOverview />} />
            <Route path="/alerts" element={<MaintenanceAlerts />} />
            <Route path="/analytics" element={<SessionAnalytics />} />
            <Route path="/sessions" element={<ActiveSessions />} />
            <Route path="/simulator" element={<SimulatorPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
