import { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import DefaultDashboard from '../components/dashboards/DefaultDashboard';
import TeamLeaderDashboard from '../components/dashboards/TeamLeaderDashboard';
import TeamMemberDashboard from '../components/dashboards/TeamMemberDashboard';
import ClientDashboard from '../components/dashboards/ClientDashboard';

const Dashboard = () => {
    const { user } = useContext(AuthContext);

    if (!user) return <div className="text-white">Loading...</div>;

    const renderDashboard = () => {
        switch (user.role) {
            case 'super_admin':
            case 'project_manager':
                // Using the specific requested layout as default for admins
                return <DefaultDashboard />;
            case 'team_leader':
                return <TeamLeaderDashboard />;
            case 'team_member':
                return <TeamMemberDashboard />;
            case 'client':
                return <ClientDashboard />;
            default:
                return (
                    <div className="flex flex-col items-center justify-center h-[70vh] text-center">
                        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                        <p className="text-dark-500">Your role ({user.role}) has not been mapped to a dashboard yet.</p>
                    </div>
                );
        }
    };

    return (
        <div className="animate-in fade-in duration-700">
            {renderDashboard()}
        </div>
    );
};

export default Dashboard;
