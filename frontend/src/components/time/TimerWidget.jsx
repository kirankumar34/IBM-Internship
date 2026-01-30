import React, { useState, useEffect } from 'react';
import { Play, Square, Clock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const TimerWidget = ({ taskId, taskTitle, onTimeLogged }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

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

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStart = () => {
        const now = new Date();
        setStartTime(now);
        setIsRunning(true);
        setElapsedSeconds(0);
        toast.info('Timer started');
    };

    const handleStop = async () => {
        if (!startTime) return;

        const endTime = new Date();
        const duration = (endTime - startTime) / (1000 * 60 * 60); // hours

        if (duration < 0.01) { // Less than ~30 seconds
            toast.error('Timer duration too short (minimum 1 minute)');
            setIsRunning(false);
            setStartTime(null);
            setElapsedSeconds(0);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/timelogs', {
                taskId,
                date: startTime.toISOString().split('T')[0],
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                description: 'Timer-based entry',
                isManual: false
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(`Time logged: ${duration.toFixed(2)} hours`);

            setIsRunning(false);
            setStartTime(null);
            setElapsedSeconds(0);

            if (onTimeLogged) onTimeLogged();
        } catch (error) {
            console.error('Error logging time:', error);
            toast.error(error.response?.data?.message || 'Failed to log time');
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
                        className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-medium transition"
                        title="Stop timer and save"
                    >
                        <Square size={12} />
                        Stop
                    </button>
                </>
            ) : (
                <button
                    onClick={handleStart}
                    className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium transition"
                    title="Start timer"
                >
                    <Play size={12} />
                    Start Timer
                </button>
            )}
        </div>
    );
};

export default TimerWidget;
