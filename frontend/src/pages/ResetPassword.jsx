import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Lock } from 'lucide-react';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const { token } = useParams();
    const navigate = useNavigate();

    const onSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords don't match");
            return;
        }

        try {
            // Direct axios call
            const res = await axios.put(`http://localhost:5000/api/auth/resetpassword/${token}`, { password });

            if (res.data.success) {
                toast.success('Password successfully reset! Please login.');
                navigate('/login');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Reset failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-dark-900 p-6">
            <div className="max-w-md w-full space-y-8 bg-dark-700 p-10 rounded-3xl border border-dark-600 shadow-2xl">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mb-4">
                        <Lock size={32} />
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Set New Password</h2>
                    <p className="mt-2 text-dark-500">Must be different from last 3 passwords.</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={onSubmit}>
                    <div className="space-y-4">
                        <input
                            type="password"
                            required
                            className="w-full bg-dark-800 border border-dark-600 rounded-2xl py-4 px-4 text-white placeholder-dark-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="New Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <input
                            type="password"
                            required
                            className="w-full bg-dark-800 border border-dark-600 rounded-2xl py-4 px-4 text-white placeholder-dark-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="Confirm New Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary-hover text-dark-900 font-bold py-4 rounded-2xl shadow-[0_10px_20px_-10px_rgba(209,243,102,0.5)] transition-all font-sans"
                    >
                        Update Password
                    </button>

                    <div className="text-center pt-4">
                        <Link to="/login" className="text-sm text-dark-500 hover:text-white transition-colors">
                            Back to Login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
