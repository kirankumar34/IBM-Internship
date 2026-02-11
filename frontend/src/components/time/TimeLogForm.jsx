import React, { useState } from 'react';
import { Clock, Save, X } from 'lucide-react';
import api from '../../context/api';
import { toast } from 'react-toastify';

const TimeLogForm = ({ taskId, tasks, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        taskId: taskId || '',
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        description: ''
    });
    const [loading, setLoading] = useState(false);

    const calculateDuration = () => {
        if (!formData.startTime || !formData.endTime) return '0.0';
        const start = new Date(`${formData.date}T${formData.startTime}`);
        const end = new Date(`${formData.date}T${formData.endTime}`);
        const hours = (end - start) / (1000 * 60 * 60);
        return hours > 0 ? hours.toFixed(1) : '0.0';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.taskId || !formData.startTime || !formData.endTime) {
            toast.error('Please fill all required fields');
            return;
        }

        const start = new Date(`${formData.date}T${formData.startTime}`);
        const end = new Date(`${formData.date}T${formData.endTime}`);

        if (start >= end) {
            toast.error('End time must be after start time');
            return;
        }

        setLoading(true);
        try {
            await api.post('/timelogs', {
                taskId: formData.taskId,
                date: formData.date,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                description: formData.description,
                isManual: true
            });

            toast.success('Time log added successfully');
            if (onSuccess) onSuccess();

            // Reset form
            setFormData({
                taskId: taskId || '',
                date: new Date().toISOString().split('T')[0],
                startTime: '',
                endTime: '',
                description: ''
            });
        } catch (error) {
            console.error('Error creating time log:', error);
            toast.error(error.response?.data?.message || 'Failed to add time log');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-dark-900 border border-dark-600 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Clock size={20} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Log Time</h3>
                </div>
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-white transition"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Task *
                    </label>
                    <select
                        value={formData.taskId}
                        onChange={(e) => setFormData({ ...formData, taskId: e.target.value })}
                        className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                        required
                        disabled={!!taskId}
                    >
                        <option value="">Select a task</option>
                        {tasks?.map(task => (
                            <option key={task._id} value={task._id}>
                                {task.title}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Date *
                    </label>
                    <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Start Time *
                        </label>
                        <input
                            type="time"
                            value={formData.startTime}
                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            End Time *
                        </label>
                        <input
                            type="time"
                            value={formData.endTime}
                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                            required
                        />
                    </div>
                </div>

                {formData.startTime && formData.endTime && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <p className="text-sm text-blue-400">
                            Duration: <span className="font-semibold">{calculateDuration()} hours</span>
                        </p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description (Optional)
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        placeholder="What did you work on?"
                        className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save Time Log'}
                    </button>
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-2.5 bg-dark-800 text-gray-300 rounded-lg hover:bg-dark-700 transition"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default TimeLogForm;
