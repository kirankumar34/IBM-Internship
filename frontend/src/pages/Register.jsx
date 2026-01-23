import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { toast } from 'react-toastify';
import { UserPlus, Mail, Lock, UserCheck } from 'lucide-react';

const Register = () => {
    const { register, user: currentUser } = useContext(AuthContext);
    const navigate = useNavigate();

    // Updated roles for public/admin visibility
    const allRoles = [
        { value: 'super_admin', label: 'Super Admin' },
        { value: 'project_manager', label: 'Project Manager' },
        { value: 'team_leader', label: 'Team Leader' },
        { value: 'team_member', label: 'Team Member' },
        { value: 'client', label: 'Client (Public)' }
    ];

    const rolePermissions = {
        'super_admin': [allRoles[1]], // PM
        'project_manager': [allRoles[2]], // TL
        'team_leader': [allRoles[3]], // TM
        'null': allRoles // Show all roles for public registration as requested
    };

    const currentRoleKey = currentUser ? currentUser.role : 'null';
    const allowedOptions = rolePermissions[currentRoleKey] || allRoles;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: allowedOptions[0]?.value || 'client'
    });

    const { name, email, password, role } = formData;

    const onChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
        }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await register(formData);
            toast.success(currentUser ? `User Created: ${role}` : 'Registration successful!');

            // If someone is already logged in (Admin creating user), stay here or go to team
            if (currentUser) {
                navigate('/team');
            } else {
                navigate('/');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-dark-900 p-6">
            <div className="max-w-md w-full space-y-8 bg-dark-700 p-10 rounded-3xl border border-dark-600 shadow-2xl">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mb-4 transform -rotate-6">
                        <UserPlus size={32} />
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                        {currentUser ? 'Add New User' : 'Create Account'}
                    </h2>
                    <p className="mt-2 text-dark-500">
                        {currentUser
                            ? `As ${currentUser.role.replace('_', ' ')}, you can add ${allowedOptions.map(o => o.label).join(', ')}.`
                            : 'Join our project management workspace.'}
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={onSubmit}>
                    <div className="space-y-4">
                        <div className="relative group">
                            <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500 group-focus-within:text-primary transition-colors" size={18} />
                            <input
                                name="name"
                                type="text"
                                required
                                className="w-full bg-dark-800 border border-dark-600 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-dark-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="Full Name"
                                value={name}
                                onChange={onChange}
                            />
                        </div>

                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500 group-focus-within:text-primary transition-colors" size={18} />
                            <input
                                name="email"
                                type="email"
                                required
                                className="w-full bg-dark-800 border border-dark-600 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-dark-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="Email Address"
                                value={email}
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

                        <div className="space-y-1">
                            <label className="text-xs text-dark-500 font-bold uppercase ml-2">Assign Role</label>
                            <select
                                name="role"
                                value={role}
                                onChange={onChange}
                                className="w-full bg-dark-800 border border-dark-600 rounded-2xl py-4 px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none"
                            >
                                {allowedOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                                {allowedOptions.length === 0 && <option value="client text-dark-500">No Roles Possible</option>}
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={allowedOptions.length === 0}
                        className="w-full bg-primary hover:bg-primary-hover disabled:bg-dark-600 disabled:text-dark-500 text-dark-900 font-bold py-4 rounded-2xl shadow-[0_10px_20px_-10px_rgba(209,243,102,0.5)] transition-all font-sans"
                    >
                        {currentUser ? 'Confirm User Creation' : 'Get Started'}
                    </button>

                    {!currentUser && (
                        <div className="text-center">
                            <Link to="/login" className="text-sm text-dark-500 hover:text-white transition-colors">
                                Already have an account? <span className="text-primary font-bold">Sign In</span>
                            </Link>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default Register;
