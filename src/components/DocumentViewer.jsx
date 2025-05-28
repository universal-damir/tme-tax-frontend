import React from 'react';
import { File, FileText, BarChart3, Table } from 'lucide-react';

const DocumentViewer = ({ documents }) => {
  const getFileIcon = (type) => {
    switch (type) {
      case 'PDF':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'Excel':
        return <BarChart3 className="w-5 h-5 text-green-500" />;
      case 'CSV':
        return <Table className="w-5 h-5 text-blue-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <File className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No documents uploaded yet</p>
        <p className="text-sm mt-1">Upload PDF, CSV, or Excel files to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-gray-700 text-sm uppercase tracking-wide">
        Uploaded Documents ({documents.length})
      </h3>
      
      <div className="space-y-2">
        {documents.map((doc, index) => (
          <div
            key={doc.id || index}
            className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
          >
            <div className="flex-shrink-0">
              {getFileIcon(doc.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate" title={doc.name}>
                {doc.name}
              </p>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>{formatFileSize(doc.size)}</span>
                <span>•</span>
                <span>{doc.type}</span>
                {doc.chunksCreated && (
                  <>
                    <span>•</span>
                    <span>{doc.chunksCreated} chunks</span>
                  </>
                )}
              </div>
              {doc.uploadedAt && (
                <p className="text-xs text-gray-400 mt-1">
                  Uploaded {formatDate(doc.uploadedAt)}
                </p>
              )}
            </div>
            
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-green-400 rounded-full" title="Successfully processed" />
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-xs text-gray-500 mt-3 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
        <strong>💡 Tip:</strong> You can now ask questions about the content in these documents. 
        The AI will use them to provide more accurate tax calculations and advice.
      </div>
    </div>
  );
};

export default DocumentViewer; 