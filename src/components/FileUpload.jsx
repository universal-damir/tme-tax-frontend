import React, { useState, useRef } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { API_URL, defaultFetchOptions } from '../config';

const FileUpload = ({ onUploadSuccess, onUploadError, conversationId, onRequireConversation }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const allowedTypes = ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  const allowedExtensions = ['.pdf', '.csv', '.xlsx', '.xls'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const validateFile = (file) => {
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return 'Invalid file type. Only PDF, CSV, and Excel files are allowed.';
    }
    
    if (file.size > maxFileSize) {
      return 'File size must be less than 10MB.';
    }
    
    return null;
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = async (files) => {
    let convId = conversationId;
    if (!convId && onRequireConversation) {
      try {
        convId = await onRequireConversation();
      } catch (err) {
        onUploadError?.('Could not create a conversation for upload.');
        return;
      }
    }
    files.forEach(file => {
      const error = validateFile(file);
      if (error) {
        onUploadError?.(error);
        return;
      }
      uploadFile(file, convId);
    });
  };

  const uploadFile = async (file, convId = conversationId) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('document', file);
    try {
      const userId = localStorage.getItem('userId') || '1';
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': userId,
          'Accept': 'application/json',
          'Origin': window.location.origin,
          'X-Conversation-Id': convId || ''
        },
        mode: 'cors',
        credentials: 'include',
        body: formData
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      const result = await response.json();
      const fileInfo = {
        id: Date.now(),
        name: result.document.fileName,
        type: result.document.fileType,
        size: result.document.fileSize,
        uploadedAt: result.document.processedAt,
        chunksCreated: result.document.chunksCreated,
        conversationId: convId,
        status: 'success'
      };
      setUploadedFiles(prev => [...prev, fileInfo]);
      onUploadSuccess?.(fileInfo);
    } catch (error) {
      console.error('Error uploading file:', error);
      const errorFile = {
        id: Date.now(),
        name: file.name,
        size: file.size,
        status: 'error',
        error: error.message
      };
      setUploadedFiles(prev => [...prev, errorFile]);
      onUploadError?.(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'PDF':
        return '📄';
      case 'Excel':
        return '📊';
      case 'CSV':
        return '📈';
      default:
        return '📎';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.csv,.xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="space-y-3">
          {isUploading ? (
            <Loader className="w-12 h-12 mx-auto text-blue-500 animate-spin" />
          ) : (
            <Upload className="w-12 h-12 mx-auto text-gray-400" />
          )}
          
          <div>
            <p className="text-lg font-medium text-gray-700">
              {isUploading ? 'Uploading...' : 'Drop files here or click to upload'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {'Supports PDF, CSV, and Excel files (max 10MB each)'}
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-gray-700">Uploaded Documents</h3>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className={`flex items-center justify-between p-3 rounded-lg border
                  ${file.status === 'success' 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getFileIcon(file.type)}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{file.name}</p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>{formatFileSize(file.size)}</span>
                      {file.chunksCreated && (
                        <span>• {file.chunksCreated} chunks processed</span>
                      )}
                    </div>
                    {file.error && (
                      <p className="text-sm text-red-600 mt-1">{file.error}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {file.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-gray-200 rounded"
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload; 