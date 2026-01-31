import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Team from './pages/Team';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Analytics from './pages/Analytics';
import ProjectDetail from './pages/ProjectDetail';
import PrivateRoute from './components/PrivateRoute';

import Layout from './components/Layout';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password/:token" element={<ResetPassword />} />

                    <Route element={<PrivateRoute />}>
                        <Route path="/" element={
                            <Layout>
                                <Dashboard />
                            </Layout>
                        } />
                        <Route path="/projects" element={<Layout><Projects /></Layout>} />
                        <Route path="/projects/:id" element={<Layout><ProjectDetail /></Layout>} />
                        <Route path="/team" element={<Layout><Team /></Layout>} />

                        <Route path="/messages" element={<Layout><Messages /></Layout>} />
                        <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
                        <Route path="/settings" element={<Layout><Settings /></Layout>} />
                        <Route path="/help" element={<Layout><Help /></Layout>} />
                    </Route>
                </Routes>
            </Router>
            <ToastContainer position="bottom-right" theme="dark" />
        </AuthProvider>
    );
}

export default App;
