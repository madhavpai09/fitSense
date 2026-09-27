import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('memberData');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        NEXUS<span className="navbar-brand-dot"></span>
      </div>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="label">Dashboard</span>
        </NavLink>
        <NavLink to="/plan" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="label">Plan</span>
        </NavLink>
        <NavLink to="/nutrition" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="label">Nutrition</span>
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="label">History</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="label">Profile</span>
        </NavLink>
      </div>
      <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
    </nav>
  );
};

export default Navbar;
