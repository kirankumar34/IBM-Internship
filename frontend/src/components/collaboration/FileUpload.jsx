import React, { useState, useEffect } from 'react';
import { Upload, File, Download, Trash2, FileText, Image as ImageIcon, Archive } from 'lucide-react';
import api from '../../context/api';
import { toast } from 'react-toastify';

const FileUpload = ({ taskId, projectId, currentUser }) => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        fetchFiles();
    }, [taskId, projectId]);

    const fetchFiles = async () => {
        try {
            const endpoint = taskId
                ? `/files/task/${taskId}`
                : `/files/project/${projectId}`;

            const response = await api.get(endpoint);
            setFiles(response.data);
        } catch (error) {
            console.error('Error fetching files:', error);
        }
    };

    const handleFileUpload = async (selectedFiles) => {
        if (!selectedFiles || selectedFiles.length === 0) return;

        const file = selectedFiles[0]; // Single file upload

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            toast.error('File size must be less than 10MB');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('taskId', taskId || '');
        formData.append('projectId', projectId || '');

        try {
            await api.post('/files/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            toast.success('File uploaded successfully');
            await fetchFiles();
        } catch (error) {
            console.error('Error uploading file:', error);
            toast.error(error.response?.data?.message || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files);
        }
    };

    const handleDelete = async (fileId) => {
        if (!window.confirm('Are you sure you want to delete this file?')) return;

        try {
            await api.delete(`/files/${fileId}`);

            toast.success('File deleted');
            await fetchFiles();
        } catch (error) {
            console.error('Error deleting file:', error);
            toast.error(error.response?.data?.message || 'Failed to delete file');
        }
    };

    const handleDownload = async (fileId, originalName) => {
        try {
            const response = await api.get(`/files/${fileId}/download`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', originalName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading file:', error);
            toast.error('Failed to download file');
        }
    };

    const getFileIcon = (mimetype) => {
        if (mimetype.startsWith('image/')) return <ImageIcon size={20} className="text-blue-400" />;
        if (mimetype.includes('pdf')) return <FileText size={20} className="text-red-400" />;
        if (mimetype.includes('zip') || mimetype.includes('rar')) return <Archive size={20} className="text-yellow-400" />;
        return <File size={20} className="text-gray-400" />;
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const canDelete = (file) => {
        if (!currentUser) return false;
        return file.uploader._id === currentUser.id || currentUser.role === 'super_admin';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Upload size={20} className="text-purple-400" />
                <h3 className="text-lg font-semibold text-white">
                    Files ({files.length})
                </h3>
            </div>

            {/* Upload Area - Hidden for restricted roles */}
            {currentUser?.role !== 'client' && (
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition ${dragActive
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-dark-600 hover:border-dark-500'
                        }`}
                >
                    <Upload size={40} className="mx-auto mb-3 text-gray-500" />
                    <p className="text-gray-400 mb-2">
                        Drag and drop a file here, or click to select
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                        Maximum file size: 10MB
                    </p>
                    <label className="inline-block bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition cursor-pointer">
                        {uploading ? 'Uploading...' : 'Choose File'}
                        <input
                            type="file"
                            onChange={(e) => handleFileUpload(e.target.files)}
                            className="hidden"
                            disabled={uploading}
                        />
                    </label>
                </div>
            )}

            {/* File List */}
            <div className="space-y-2">
                {files.map(file => (
                    <div key={file._id} className="bg-dark-800 border border-dark-600 rounded-lg p-4 flex items-center justify-between hover:border-dark-500 transition">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            {getFileIcon(file.mimetype)}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-white truncate">
                                        {file.originalName}
                                    </p>
                                    {file.version > 1 && (
                                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                                            v{file.version}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400">
                                    {formatFileSize(file.size)} • Uploaded by {file.uploader.name} • {new Date(file.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                            <button
                                onClick={() => handleDownload(file._id, file.originalName)}
                                className="text-gray-400 hover:text-blue-400 transition"
                                title="Download"
                            >
                                <Download size={18} />
                            </button>
                            {canDelete(file) && (
                                <button
                                    onClick={() => handleDelete(file._id)}
                                    className="text-gray-400 hover:text-red-400 transition"
                                    title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {files.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        <File size={40} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No files uploaded yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileUpload;
