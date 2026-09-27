import SimulatorPanel from '../components/SimulatorPanel';

const SimulatorPage = () => {
    return (
        <>
            <div>
                <h1 className="page-title">Demo Simulator</h1>
                <p className="page-subtitle">Generate synthetic treadmill data for pitches, stress-tests, and offline demos</p>
            </div>
            <SimulatorPanel />
        </>
    );
};

export default SimulatorPage;
