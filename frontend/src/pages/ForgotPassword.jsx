import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../context/api';
import { toast } from 'react-toastify';
import { KeyRound, ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
    const [loginId, setLoginId] = useState('');
    const navigate = useNavigate();

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/auth/forgotpassword', { loginId });

            // For demo: show the token in toast so they can "click" it (copy paste)
            if (res.data.success) {
                toast.success('Reset Token Simulated! Check Console/Toast');
                console.log('RESET TOKEN:', res.data.data); // For developer visible
                // Navigate to reset page with token pre-filled or ask them to click link
                // Here we'll redirect to reset page with token query param for convenience in this demo
                const token = res.data.data;
                navigate(`/reset-password/${token}`);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Request failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-dark-900 p-6">
            <div className="max-w-md w-full space-y-8 bg-dark-700 p-10 rounded-3xl border border-dark-600 shadow-2xl">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mb-4">
                        <KeyRound size={32} />
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Forgot Password</h2>
                    <p className="mt-2 text-dark-500">Enter your Login ID to recover access.</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={onSubmit}>
                    <div className="relative group">
                        <input
                            name="loginId"
                            type="text"
                            required
                            className="w-full bg-dark-800 border border-dark-600 rounded-2xl py-4 px-4 text-white placeholder-dark-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="Login ID"
                            value={loginId}
                            onChange={(e) => setLoginId(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary-hover text-dark-900 font-bold py-4 rounded-2xl shadow-[0_10px_20px_-10px_rgba(209,243,102,0.5)] transition-all font-sans"
                    >
                        Verify & Reset
                    </button>

                    <div className="text-center pt-4">
                        <Link to="/login" className="flex items-center justify-center text-sm text-dark-500 hover:text-white transition-colors">
                            <ArrowLeft size={16} className="mr-2" /> Back to Login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ForgotPassword;
