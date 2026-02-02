import React, { useState, useEffect, useContext } from 'react';
import { MessageCircle, Send, Pin, Lock, Unlock, Trash2, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import api from '../../context/api';
import AuthContext from '../../context/AuthContext';

const DiscussionBoard = ({ projectId }) => {
    const { user } = useContext(AuthContext);
    const [discussions, setDiscussions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [newDiscussion, setNewDiscussion] = useState({ title: '', description: '' });
    const [showNewForm, setShowNewForm] = useState(false);
    const [replyContent, setReplyContent] = useState({});

    useEffect(() => {
        if (projectId) {
            fetchDiscussions();
        }
    }, [projectId]);

    const fetchDiscussions = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/discussions/project/${projectId}`);
            setDiscussions(res.data);
        } catch (error) {
            console.error('Error fetching discussions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDiscussion = async (e) => {
        e.preventDefault();
        if (!newDiscussion.title.trim() || !newDiscussion.description.trim()) return;

        try {
            await api.post('/discussions', {
                projectId,
                title: newDiscussion.title,
                description: newDiscussion.description
            });
            setNewDiscussion({ title: '', description: '' });
            setShowNewForm(false);
            fetchDiscussions();
        } catch (error) {
            console.error('Error creating discussion:', error);
        }
    };

    const handleReply = async (discussionId) => {
        const content = replyContent[discussionId];
        if (!content?.trim()) return;

        try {
            await api.post(`/discussions/${discussionId}/replies`, { content });
            setReplyContent({ ...replyContent, [discussionId]: '' });
            fetchDiscussions();
        } catch (error) {
            console.error('Error adding reply:', error);
        }
    };

    const handleDelete = async (discussionId) => {
        if (!window.confirm('Delete this discussion?')) return;
        try {
            await api.delete(`/discussions/${discussionId}`);
            fetchDiscussions();
        } catch (error) {
            console.error('Error deleting discussion:', error);
        }
    };

    const handleTogglePin = async (discussionId) => {
        try {
            await api.put(`/discussions/${discussionId}/pin`);
            fetchDiscussions();
        } catch (error) {
            console.error('Error toggling pin:', error);
        }
    };

    const handleToggleClose = async (discussionId) => {
        try {
            await api.put(`/discussions/${discussionId}/close`);
            fetchDiscussions();
        } catch (error) {
            console.error('Error toggling close:', error);
        }
    };

    const canManage = ['super_admin', 'project_admin', 'project_manager'].includes(user?.role);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <MessageCircle className="text-primary" size={24} />
                    <h2 className="text-xl font-bold text-white">Discussions</h2>
                    <span className="bg-dark-700 text-dark-300 text-xs px-2 py-1 rounded-lg font-bold">
                        {discussions.length}
                    </span>
                </div>
                <button
                    onClick={() => setShowNewForm(!showNewForm)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-dark-900 px-4 py-2 rounded-xl font-bold text-sm transition"
                >
                    <Plus size={16} />
                    New Discussion
                </button>
            </div>

            {/* New Discussion Form */}
            {showNewForm && (
                <form onSubmit={handleCreateDiscussion} className="bg-dark-800 border border-dark-700 rounded-2xl p-6 space-y-4">
                    <input
                        type="text"
                        placeholder="Discussion Title"
                        value={newDiscussion.title}
                        onChange={(e) => setNewDiscussion({ ...newDiscussion, title: e.target.value })}
                        className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-dark-500 focus:border-primary focus:outline-none"
                    />
                    <textarea
                        placeholder="Describe your topic... (Use @username to mention)"
                        value={newDiscussion.description}
                        onChange={(e) => setNewDiscussion({ ...newDiscussion, description: e.target.value })}
                        rows={4}
                        className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-dark-500 focus:border-primary focus:outline-none resize-none"
                    />
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setShowNewForm(false)}
                            className="px-4 py-2 text-dark-400 hover:text-white transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-dark-900 px-6 py-2 rounded-xl font-bold transition"
                        >
                            <Send size={16} />
                            Post Discussion
                        </button>
                    </div>
                </form>
            )}

            {/* Discussions List */}
            {discussions.length === 0 ? (
                <div className="bg-dark-800/50 border border-dark-700 rounded-2xl p-10 text-center">
                    <MessageCircle size={48} className="mx-auto text-dark-600 mb-4" />
                    <p className="text-white font-bold">No discussions yet</p>
                    <p className="text-dark-400 text-sm mt-1">Start a conversation with your team</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {discussions.map(discussion => (
                        <div
                            key={discussion._id}
                            className={`bg-dark-800/50 border rounded-2xl overflow-hidden transition ${discussion.isPinned ? 'border-primary/30' : 'border-dark-700'
                                }`}
                        >
                            {/* Discussion Header */}
                            <div
                                className="p-5 cursor-pointer hover:bg-dark-800 transition"
                                onClick={() => setExpandedId(expandedId === discussion._id ? null : discussion._id)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1">
                                        <div className="mt-1">
                                            {expandedId === discussion._id ? (
                                                <ChevronDown size={18} className="text-dark-400" />
                                            ) : (
                                                <ChevronRight size={18} className="text-dark-400" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                {discussion.isPinned && <Pin size={14} className="text-primary" />}
                                                {discussion.isClosed && <Lock size={14} className="text-red-400" />}
                                                <h3 className="text-white font-bold">{discussion.title}</h3>
                                            </div>
                                            <p className="text-dark-400 text-sm mt-1 line-clamp-1">
                                                {discussion.description}
                                            </p>
                                            <div className="flex items-center gap-4 mt-3 text-xs text-dark-500">
                                                <span>By {discussion.createdBy?.name}</span>
                                                <span>{new Date(discussion.createdAt).toLocaleDateString()}</span>
                                                <span>{discussion.replies?.length || 0} replies</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {canManage && (
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleTogglePin(discussion._id)}
                                                className={`p-2 rounded-lg transition ${discussion.isPinned ? 'bg-primary/20 text-primary' : 'hover:bg-dark-700 text-dark-400'}`}
                                                title={discussion.isPinned ? 'Unpin' : 'Pin'}
                                            >
                                                <Pin size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleClose(discussion._id)}
                                                className={`p-2 rounded-lg transition ${discussion.isClosed ? 'bg-red-500/20 text-red-400' : 'hover:bg-dark-700 text-dark-400'}`}
                                                title={discussion.isClosed ? 'Reopen' : 'Close'}
                                            >
                                                {discussion.isClosed ? <Unlock size={16} /> : <Lock size={16} />}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(discussion._id)}
                                                className="p-2 rounded-lg hover:bg-red-500/20 text-dark-400 hover:text-red-400 transition"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedId === discussion._id && (
                                <div className="border-t border-dark-700">
                                    {/* Full Description */}
                                    <div className="p-5 bg-dark-900/50">
                                        <p className="text-dark-300 whitespace-pre-wrap">{discussion.description}</p>
                                    </div>

                                    {/* Replies */}
                                    {discussion.replies?.length > 0 && (
                                        <div className="border-t border-dark-700 divide-y divide-dark-700">
                                            {discussion.replies.map((reply, idx) => (
                                                <div key={idx} className="p-4 pl-10">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-6 h-6 bg-dark-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                            {reply.user?.name?.charAt(0) || 'U'}
                                                        </div>
                                                        <span className="text-white text-sm font-medium">{reply.user?.name}</span>
                                                        <span className="text-dark-500 text-xs">
                                                            {new Date(reply.createdAt).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-dark-300 text-sm pl-8">{reply.content}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Reply Form */}
                                    {!discussion.isClosed && (
                                        <div className="p-4 border-t border-dark-700">
                                            <div className="flex gap-3">
                                                <input
                                                    type="text"
                                                    placeholder="Write a reply..."
                                                    value={replyContent[discussion._id] || ''}
                                                    onChange={(e) => setReplyContent({ ...replyContent, [discussion._id]: e.target.value })}
                                                    className="flex-1 bg-dark-900 border border-dark-600 rounded-xl px-4 py-2 text-white text-sm placeholder-dark-500 focus:border-primary focus:outline-none"
                                                    onKeyDown={(e) => e.key === 'Enter' && handleReply(discussion._id)}
                                                />
                                                <button
                                                    onClick={() => handleReply(discussion._id)}
                                                    className="p-2 bg-primary hover:bg-primary-hover text-dark-900 rounded-xl transition"
                                                >
                                                    <Send size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DiscussionBoard;
