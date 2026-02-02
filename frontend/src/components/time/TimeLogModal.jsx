import React, { useState } from 'react';
import { X, Clock, Calendar, FileText, Send } from 'lucide-react';
import api from '../../context/api';
import { toast } from 'react-toastify';

const TimeLogModal = ({ isOpen, onClose, taskId, taskTitle, onTimeLogged }) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:00',
        description: ''
    });
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate times
        const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
        const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

        if (startDateTime >= endDateTime) {
            toast.error('End time must be after start time');
            return;
        }

        try {
            setLoading(true);
            await api.post('/timelogs', {
                taskId,
                date: formData.date,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                description: formData.description,
                isManual: true
            });

            const hours = (endDateTime - startDateTime) / (1000 * 60 * 60);
            toast.success(`Logged ${hours.toFixed(2)} hours successfully`);

            if (onTimeLogged) onTimeLogged();
            onClose();
            setFormData({
                date: new Date().toISOString().split('T')[0],
                startTime: '09:00',
                endTime: '17:00',
                description: ''
            });
        } catch (error) {
            console.error('Error logging time:', error);
            toast.error(error.response?.data?.message || 'Failed to log time');
        } finally {
            setLoading(false);
        }
    };

    const calculateDuration = () => {
        const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
        const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);
        if (startDateTime >= endDateTime) return '0h 0m';
        const diff = endDateTime - startDateTime;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/95 backdrop-blur-md animate-in fade-in">
            <div className="bg-dark-800 w-full max-w-md rounded-3xl border border-dark-700 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-dark-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-xl">
                            <Clock size={20} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Log Time</h2>
                            <p className="text-xs text-dark-400 truncate max-w-[200px]">{taskTitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-dark-700 rounded-xl transition text-dark-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Date */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-dark-400 uppercase tracking-wider mb-2">
                            <Calendar size={14} />
                            Date
                        </label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none"
                            required
                        />
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-dark-400 uppercase tracking-wider mb-2">
                                Start Time
                            </label>
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-dark-400 uppercase tracking-wider mb-2">
                                End Time
                            </label>
                            <input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none"
                                required
                            />
                        </div>
                    </div>

                    {/* Duration Preview */}
                    <div className="bg-dark-900/50 border border-dark-700 rounded-xl p-4 text-center">
                        <p className="text-dark-400 text-xs uppercase font-bold tracking-wider mb-1">Duration</p>
                        <p className="text-2xl font-black text-primary">{calculateDuration()}</p>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-dark-400 uppercase tracking-wider mb-2">
                            <FileText size={14} />
                            Description (optional)
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="What did you work on?"
                            rows={3}
                            className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-dark-500 focus:border-primary focus:outline-none resize-none"
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-dark-900 py-3.5 rounded-xl font-bold transition disabled:opacity-50"
                    >
                        <Send size={18} />
                        {loading ? 'Logging...' : 'Log Time Entry'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TimeLogModal;
