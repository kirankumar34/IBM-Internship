import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Team from './pages/Team';
import Timesheets from './pages/Timesheets';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Analytics from './pages/Analytics';
import ProjectDetail from './pages/ProjectDetail';
import PrivateRoute from './components/PrivateRoute';

import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
    return (
        <AuthProvider>
            <SocketProvider>
                <Router>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password/:token" element={<ResetPassword />} />

                        <Route element={<PrivateRoute />}>
                            <Route element={<ErrorBoundary><Layout><Dashboard /></Layout></ErrorBoundary>} path="/" />
                            <Route element={<ErrorBoundary><Layout><Projects /></Layout></ErrorBoundary>} path="/projects" />
                            <Route element={<ErrorBoundary><Layout><ProjectDetail /></Layout></ErrorBoundary>} path="/projects/:id" />
                            <Route element={<ErrorBoundary><Layout><Team /></Layout></ErrorBoundary>} path="/team" />
                            <Route element={<ErrorBoundary><Layout><Timesheets /></Layout></ErrorBoundary>} path="/timesheets" />
                            <Route element={<ErrorBoundary><Layout><Notifications /></Layout></ErrorBoundary>} path="/notifications" />

                            <Route element={<ErrorBoundary><Layout><Messages /></Layout></ErrorBoundary>} path="/messages" />
                            <Route element={<ErrorBoundary><Layout><Analytics /></Layout></ErrorBoundary>} path="/analytics" />
                            <Route element={<ErrorBoundary><Layout><Settings /></Layout></ErrorBoundary>} path="/settings" />
                            <Route element={<ErrorBoundary><Layout><Help /></Layout></ErrorBoundary>} path="/help" />
                        </Route>
                    </Routes>
                </Router>
                <ToastContainer position="bottom-right" theme="dark" />
            </SocketProvider>
        </AuthProvider>
    );
}

export default App;

