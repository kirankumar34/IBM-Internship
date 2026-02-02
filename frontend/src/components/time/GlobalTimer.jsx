import React, { useState, useEffect, useContext } from 'react';
import { Play, Square, Clock, AlertCircle } from 'lucide-react';
import api from '../../context/api';
import AuthContext from '../../context/AuthContext';

const GlobalTimer = () => {
    const { user } = useContext(AuthContext);
    const [activeTimer, setActiveTimer] = useState(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchActiveTimer();
        }
    }, [user]);

    useEffect(() => {
        let interval = null;

        if (activeTimer?.isActive) {
            interval = setInterval(() => {
                const now = new Date();
                const start = new Date(activeTimer.startTime);
                setElapsedSeconds(Math.floor((now - start) / 1000));
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeTimer]);

    const fetchActiveTimer = async () => {
        try {
            const res = await api.get('/timer/active');
            if (res.data) {
                setActiveTimer(res.data);
                const now = new Date();
                const start = new Date(res.data.startTime);
                setElapsedSeconds(Math.floor((now - start) / 1000));
            } else {
                setActiveTimer(null);
                setElapsedSeconds(0);
            }
        } catch (error) {
            console.error('Error fetching active timer:', error);
        }
    };

    const handleStop = async () => {
        if (!activeTimer) return;
        try {
            setLoading(true);
            await api.post('/timer/stop');
            setActiveTimer(null);
            setElapsedSeconds(0);
        } catch (error) {
            console.error('Error stopping timer:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDiscard = async () => {
        if (!activeTimer) return;
        if (!window.confirm('Discard this timer session without saving?')) return;
        try {
            setLoading(true);
            await api.delete('/timer/discard');
            setActiveTimer(null);
            setElapsedSeconds(0);
        } catch (error) {
            console.error('Error discarding timer:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!activeTimer) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <div className="bg-dark-800 border border-dark-700 rounded-2xl shadow-2xl p-4 min-w-[280px]">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Clock size={18} className="text-primary" />
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        </div>
                        <span className="text-xs font-bold text-dark-400 uppercase tracking-wider">Timer Running</span>
                    </div>
                    <button
                        onClick={handleDiscard}
                        className="text-dark-500 hover:text-red-400 transition"
                        title="Discard"
                        disabled={loading}
                    >
                        <AlertCircle size={16} />
                    </button>
                </div>

                {/* Task Info */}
                <div className="mb-3">
                    <p className="text-white font-medium text-sm truncate">
                        {activeTimer.task?.title || 'Unknown Task'}
                    </p>
                    <p className="text-dark-400 text-xs truncate">
                        {activeTimer.project?.name || 'Unknown Project'}
                    </p>
                </div>

                {/* Timer Display */}
                <div className="bg-dark-900 rounded-xl p-3 mb-3">
                    <p className="text-3xl font-mono font-bold text-white text-center tabular-nums">
                        {formatTime(elapsedSeconds)}
                    </p>
                </div>

                {/* Actions */}
                <button
                    onClick={handleStop}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-bold text-sm transition disabled:opacity-50"
                >
                    <Square size={16} />
                    {loading ? 'Saving...' : 'Stop & Save'}
                </button>
            </div>
        </div>
    );
};

export default GlobalTimer;
