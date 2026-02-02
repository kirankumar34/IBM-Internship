import React, { useState, useEffect } from 'react';
import { Play, Square, Clock } from 'lucide-react';
import api from '../../context/api';
import { toast } from 'react-toastify';

const TimerWidget = ({ taskId, taskTitle, onTimeLogged }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check for active timer on mount
        checkActiveTimer();
    }, [taskId]);

    useEffect(() => {
        let interval = null;

        if (isRunning && startTime) {
            interval = setInterval(() => {
                const now = new Date();
                const elapsed = Math.floor((now - startTime) / 1000);
                setElapsedSeconds(elapsed);
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRunning, startTime]);

    const checkActiveTimer = async () => {
        try {
            const res = await api.get('/timer/active');
            if (res.data && res.data.task?._id === taskId) {
                setIsRunning(true);
                setStartTime(new Date(res.data.startTime));
                const now = new Date();
                setElapsedSeconds(Math.floor((now - new Date(res.data.startTime)) / 1000));
            } else {
                setIsRunning(false);
                setStartTime(null);
                setElapsedSeconds(0);
            }
        } catch (error) {
            console.error('Error checking active timer:', error);
        }
    };

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStart = async () => {
        try {
            setLoading(true);
            const res = await api.post('/timer/start', { taskId });
            setStartTime(new Date(res.data.startTime));
            setIsRunning(true);
            setElapsedSeconds(0);
            toast.info('Timer started');
        } catch (error) {
            console.error('Error starting timer:', error);
            toast.error(error.response?.data?.message || 'Failed to start timer');
        } finally {
            setLoading(false);
        }
    };

    const handleStop = async () => {
        if (!isRunning) return;

        try {
            setLoading(true);
            const res = await api.post('/timer/stop');
            const duration = res.data.duration?.hours || 0;

            toast.success(`Time logged: ${duration.toFixed(2)} hours`);

            setIsRunning(false);
            setStartTime(null);
            setElapsedSeconds(0);

            if (onTimeLogged) onTimeLogged();
        } catch (error) {
            console.error('Error stopping timer:', error);
            toast.error(error.response?.data?.message || 'Failed to stop timer');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="inline-flex items-center gap-3 bg-dark-800 border border-dark-600 rounded-lg px-4 py-2">
            <Clock size={16} className="text-blue-400" />

            {isRunning ? (
                <>
                    <span className="text-sm font-mono text-white tabular-nums">
                        {formatTime(elapsedSeconds)}
                    </span>
                    <button
                        onClick={handleStop}
                        disabled={loading}
                        className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-medium transition disabled:opacity-50"
                        title="Stop timer and save"
                    >
                        <Square size={12} />
                        {loading ? 'Saving...' : 'Stop'}
                    </button>
                </>
            ) : (
                <button
                    onClick={handleStart}
                    disabled={loading}
                    className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium transition disabled:opacity-50"
                    title="Start timer"
                >
                    <Play size={12} />
                    {loading ? 'Starting...' : 'Start Timer'}
                </button>
            )}
        </div>
    );
};

export default TimerWidget;
