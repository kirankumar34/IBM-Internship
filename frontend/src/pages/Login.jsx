import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { toast } from 'react-toastify';
import { LogIn, Mail, Lock } from 'lucide-react';

const Login = () => {
    const [formData, setFormData] = useState({ loginId: '', password: '' });
    const { login, user } = useContext(AuthContext);
    const navigate = useNavigate();

    const { loginId, password } = formData;

    useEffect(() => {
        if (user) navigate('/');
    }, [user, navigate]);

    const onChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
        }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(formData);
            toast.success('Welcome back!');
            navigate('/');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-dark-900 p-6">
            <div className="max-w-md w-full space-y-8 bg-dark-700 p-10 rounded-3xl border border-dark-600 shadow-2xl">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mb-4 transform rotate-6">
                        <LogIn size={32} />
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Project Management Tool – Sign In</h2>
                    <p className="mt-2 text-dark-500">Access your role-based workspace.</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={onSubmit}>
                    <div className="space-y-4">
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500 group-focus-within:text-primary transition-colors" size={18} />
                            <input
                                name="loginId"
                                type="text"
                                required
                                className="w-full bg-dark-800 border border-dark-600 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-dark-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="Login ID"
                                value={loginId}
                                onChange={onChange}
                            />
                        </div>

                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500 group-focus-within:text-primary transition-colors" size={18} />
                            <input
                                name="password"
                                type="password"
                                required
                                className="w-full bg-dark-800 border border-dark-600 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-dark-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="Password"
                                value={password}
                                onChange={onChange}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                        <label className="flex items-center text-dark-500 cursor-pointer">
                            <input type="checkbox" className="mr-2 rounded border-dark-600 bg-dark-800 checked:bg-primary" />
                            Keep me logged in
                        </label>
                        <Link to="/forgot-password" className="text-primary hover:text-white transition-colors">Forgot Password?</Link>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary-hover text-dark-900 font-bold py-4 rounded-2xl shadow-[0_10px_20px_-10px_rgba(209,243,102,0.5)] transition-all font-sans"
                    >
                        Login
                    </button>

                    <div className="text-center pt-4 flex flex-col space-y-2">
                        <div className="text-sm text-dark-500">
                            <Link to="/register?type=client" className="hover:text-white transition-colors">
                                Register as <span className="text-primary font-bold">Client</span>
                            </Link>
                            <span className="mx-2">|</span>
                            <Link to="/register?type=member" className="hover:text-white transition-colors">
                                Register as <span className="text-primary font-bold">Member</span>
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
