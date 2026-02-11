import { createContext, useState, useEffect, useContext } from 'react';
import api from './api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = async () => {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    const parsed = JSON.parse(storedUser);
                    // Minimal validation: Check if token and critical fields exist
                    if (parsed && parsed.token && parsed.role) {
                        setUser(parsed);
                        // Optional: Verify token with backend silently to ensure it's not expired
                        // This prevents "flash of logged in" followed by 401
                        try {
                            const res = await api.get('/auth/me');
                            // Update user with fresh data from backend (e.g. if role changed)
                            const freshUser = { ...parsed, ...res.data, token: parsed.token };
                            setUser(freshUser);
                            localStorage.setItem('user', JSON.stringify(freshUser));
                        } catch (err) {
                            // If token is invalid/expired, auth middleware returns 401
                            // Interceptor handles logout, but we catch here to be safe
                            console.warn('Session verification failed', err);
                            // If 401, interceptor will have likely cleared storage, 
                            // but we ensure state is clean
                            if (err.response?.status === 401) {
                                localStorage.removeItem('user');
                                setUser(null);
                            }
                        }
                    } else {
                        // Invalid structure
                        localStorage.removeItem('user');
                        setUser(null);
                    }
                } catch (e) {
                    console.error('Auth Parse Error', e);
                    localStorage.removeItem('user');
                    setUser(null);
                }
            }
            setLoading(false);
        };

        initializeAuth();
    }, []);

    const register = async (userData) => {
        try {
            const response = await api.post('/auth/register', userData);
            if (response.data && response.data.token) {
                localStorage.setItem('user', JSON.stringify(response.data));
                setUser(response.data);
            }
            return response.data;
        } catch (error) {
            throw error;
        }
    };

    const login = async (userData) => {
        try {
            const response = await api.post('/auth/login', userData);
            if (response.data && response.data.token) {
                // Ensure organizationId is present if implied
                const userObj = response.data;
                localStorage.setItem('user', JSON.stringify(userObj));
                setUser(userObj);
            }
            return response.data;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, register, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;

