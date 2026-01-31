import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Edit2, Trash2, X, Check } from 'lucide-react';
import api from '../../context/api';
import { toast } from 'react-toastify';

const CommentSection = ({ taskId, projectId, currentUser }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchComments();
    }, [taskId, projectId]);

    const fetchComments = async () => {
        try {
            const endpoint = taskId
                ? `/comments/task/${taskId}`
                : `/comments/project/${projectId}`;

            const response = await api.get(endpoint);
            setComments(response.data);
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setLoading(true);
        try {
            await api.post('/comments', {
                taskId: taskId || null,
                projectId: projectId || null,
                content: newComment.trim()
            });

            setNewComment('');
            await fetchComments();
            toast.success('Comment added');
        } catch (error) {
            console.error('Error adding comment:', error);
            toast.error(error.response?.data?.message || 'Failed to add comment');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (comment) => {
        setEditingId(comment._id);
        setEditContent(comment.content);
    };

    const handleSaveEdit = async (commentId) => {
        if (!editContent.trim()) return;

        try {
            await api.put(`/comments/${commentId}`, {
                content: editContent.trim()
            });

            setEditingId(null);
            setEditContent('');
            await fetchComments();
            toast.success('Comment updated');
        } catch (error) {
            console.error('Error updating comment:', error);
            toast.error(error.response?.data?.message || 'Failed to update comment');
        }
    };

    const handleDelete = async (commentId) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) return;

        try {
            await api.delete(`/comments/${commentId}`);

            await fetchComments();
            toast.success('Comment deleted');
        } catch (error) {
            console.error('Error deleting comment:', error);
            toast.error(error.response?.data?.message || 'Failed to delete comment');
        }
    };

    const canEdit = (comment) => {
        if (!currentUser) return false;
        const commentAge = (new Date() - new Date(comment.createdAt)) / 1000 / 60; // minutes
        return comment.user._id === currentUser.id && commentAge <= 15;
    };

    const canDelete = (comment) => {
        if (!currentUser) return false;
        return comment.user._id === currentUser.id || currentUser.role === 'super_admin';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <MessageCircle size={20} className="text-blue-400" />
                <h3 className="text-lg font-semibold text-white">
                    Comments ({comments.length})
                </h3>
            </div>

            {/* Comment List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {comments.map(comment => (
                    <div key={comment._id} className="bg-dark-800 border border-dark-600 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                    {comment.user.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{comment.user.name}</p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(comment.createdAt).toLocaleString()}
                                        {comment.isEdited && <span className="ml-2">(edited)</span>}
                                    </p>
                                </div>
                            </div>

                            {currentUser && (
                                <div className="flex items-center gap-2">
                                    {canEdit(comment) && editingId !== comment._id && (
                                        <button
                                            onClick={() => handleEdit(comment)}
                                            className="text-gray-400 hover:text-blue-400 transition"
                                            title="Edit (within 15 minutes)"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                    {canDelete(comment) && (
                                        <button
                                            onClick={() => handleDelete(comment._id)}
                                            className="text-gray-400 hover:text-red-400 transition"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {editingId === comment._id ? (
                            <div className="space-y-2">
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                    rows={2}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleSaveEdit(comment._id)}
                                        className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 transition"
                                    >
                                        <Check size={14} />
                                        Save
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingId(null);
                                            setEditContent('');
                                        }}
                                        className="flex items-center gap-1 bg-dark-700 text-gray-300 px-3 py-1 rounded text-xs hover:bg-dark-600 transition"
                                    >
                                        <X size={14} />
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                        )}
                    </div>
                ))}

                {comments.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        <MessageCircle size={40} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No comments yet. Be the first to comment!</p>
                    </div>
                )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="bg-dark-800 border border-dark-600 rounded-lg p-4">
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-3"
                    rows={3}
                />
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading || !newComment.trim()}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50"
                    >
                        <Send size={16} />
                        {loading ? 'Posting...' : 'Post Comment'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CommentSection;
