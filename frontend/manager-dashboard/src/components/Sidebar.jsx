import { NavLink } from 'react-router-dom';

const Sidebar = ({ alertCount, activeCount }) => {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        NEXUS<span className="sidebar-logo-dot"></span> Manager
      </div>
      
      <NavLink to="/equipment" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        <span>🏋️</span> Equipment Overview
      </NavLink>
      
      <NavLink to="/alerts" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        <span>⚠️</span> Maintenance Alerts
        {alertCount > 0 && <span className="badge">{alertCount}</span>}
      </NavLink>
      
      <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        <span>📊</span> Session Analytics
      </NavLink>
      
      <NavLink to="/sessions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        <span>🟢</span> Active Sessions
        {activeCount > 0 && <span className="badge" style={{ background: 'var(--signal)', color: 'var(--ink-950)' }}>{activeCount}</span>}
      </NavLink>

      <NavLink to="/simulator" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        <span>⚡</span> Demo Simulator
      </NavLink>
    </nav>
  );
};

export default Sidebar;
