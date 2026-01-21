import { useState, useEffect } from 'react';
import api from '../context/api';
import { Mail, Phone, MoreHorizontal } from 'lucide-react';

const Team = () => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await api.get('/users');
                setUsers(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchUsers();
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Team Members</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map((user) => (
                    <div key={user._id} className="bg-dark-700 rounded-2xl border border-dark-600 p-6 flex flex-col items-center text-center hover:border-dark-500 transition">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-green-600 flex items-center justify-center text-2xl font-bold text-dark-900 mb-4">
                            {user.name.charAt(0)}
                        </div>
                        <h3 className="text-lg font-bold text-white">{user.name}</h3>
                        <p className="text-primary text-sm uppercase tracking-wider font-bold mb-4">{user.role.replace('_', ' ')}</p>

                        <div className="flex space-x-2 w-full mt-auto">
                            <button className="flex-1 bg-dark-800 hover:bg-dark-600 py-2 rounded-lg text-dark-500 hover:text-white transition flex items-center justify-center">
                                <Mail size={18} />
                            </button>
                            <button className="flex-1 bg-dark-800 hover:bg-dark-600 py-2 rounded-lg text-dark-500 hover:text-white transition flex items-center justify-center">
                                <Phone size={18} />
                            </button>
                            <button className="flex-1 bg-dark-800 hover:bg-dark-600 py-2 rounded-lg text-dark-500 hover:text-white transition flex items-center justify-center">
                                <MoreHorizontal size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Team;
