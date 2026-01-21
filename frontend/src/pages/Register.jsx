import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { toast } from 'react-toastify';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'employee'
    });
    const { register, user } = useContext(AuthContext);
    const navigate = useNavigate();

    const { name, email, password, role } = formData;

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
            await register(formData);
            navigate('/');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
                <h2 className="text-center text-3xl font-extrabold text-gray-900">Create Account</h2>
                <form className="mt-8 space-y-6" onSubmit={onSubmit}>
                    <div className="rounded-md shadow-sm space-y-2">
                        <input
                            name="name"
                            type="text"
                            required
                            className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            placeholder="Full Name"
                            value={name}
                            onChange={onChange}
                        />
                        <input
                            name="email"
                            type="email"
                            required
                            className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            placeholder="Email address"
                            value={email}
                            onChange={onChange}
                        />
                        <input
                            name="password"
                            type="password"
                            required
                            className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            placeholder="Password"
                            value={password}
                            onChange={onChange}
                        />
                        <select
                            name="role"
                            value={role}
                            onChange={onChange}
                            className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        >
                            <option value="employee">Employee</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                            <option value="client">Client</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                        Register
                    </button>
                    <div className="text-center">
                        <a href="/login" className="text-sm text-primary hover:text-indigo-500">Already have an account? Login</a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;
