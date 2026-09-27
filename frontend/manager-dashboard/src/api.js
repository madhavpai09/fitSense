import { API_BASE_URL } from './constants';

export const fetchMachines = async (gymId = null) => {
    try {
        const url = gymId ? `${API_BASE_URL}/machines?gym_id=${gymId}` : `${API_BASE_URL}/machines`;
        const response = await fetch(url);
        return await response.json();
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const fetchActiveSessions = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/sessions/active`);
        return await response.json();
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const fetchAlerts = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/alerts`);
        return await response.json();
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const fetchAnalyticsOverview = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/overview`);
        return await response.json();
    } catch (e) {
        console.error(e);
        return {
            total_active_sessions: 0,
            total_sessions_today: 0,
            average_session_duration: 0,
            total_members: 0,
            sessions_per_hour: [],
            daily_sessions: [],
            utilisation_distribution: [],
            duration_by_machine: [],
            peak_hour: "N/A",
            most_used_machine: "N/A",
            total_hours: 0
        };
    }
};

export const fetchMachineUtilisation = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/machines/${id}/utilisation`);
        return await response.json();
    } catch (e) {
        console.error(e);
        return { utilisation: 0 };
    }
};

// NEW: Fetch gyms
export const fetchGyms = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/gyms`);
        return await response.json();
    } catch (e) {
        console.error(e);
        return [];
    }
};
