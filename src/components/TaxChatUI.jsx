import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, X, Paperclip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { API_URL, defaultFetchOptions } from '../config';
import Sidebar from './Sidebar';
import DocumentViewer from './DocumentViewer';
import { useNavigate } from 'react-router-dom';

const TaxChatUI = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([{
    sender: 'assistant',
    text: "# Welcome to TME Services Virtual CIT Assistant\n\nI'm here to help you with UAE Corporate Income Tax questions. Upload your documents below or ask me anything to get started."
  }]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamedMessage, setStreamedMessage] = useState('');
  const [error, setError] = useState(null);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [waitingForFirstToken, setWaitingForFirstToken] = useState(false);

  // File upload validation
  const allowedTypes = ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  const allowedExtensions = ['.pdf', '.csv', '.xlsx', '.xls'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  // Fetch conversations on component mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversationId) {
      fetchConversationMessages(selectedConversationId);
    }
  }, [selectedConversationId]);

  // File validation function
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

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set drag over to false if we're leaving the main container
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
    // Reset the input value so the same file can be selected again
    e.target.value = '';
  };

  const handleFiles = async (files) => {
    let convId = selectedConversationId;
    if (!convId) {
      try {
        convId = await handleRequireConversation();
      } catch (err) {
        setError('Could not create a conversation for upload.');
        return;
      }
    }

    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        setError(error);
        continue;
      }
      await uploadFile(file, convId);
    }
  };

  const uploadFile = async (file, convId = selectedConversationId) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('document', file);
    
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (!convId) {
        throw new Error('No conversation selected. Please start a conversation first.');
      }
      
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': userId,
          'Accept': 'application/json',
          'Origin': window.location.origin,
          'X-Conversation-Id': convId
        },
        mode: 'cors',
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication expired. Please log in again.');
        }
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
      
      setUploadedDocuments(prev => [...prev, fileInfo]);
      setError(null);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        // Redirect to login instead of using fallback userId
        console.warn('No userId found in localStorage, redirecting to login');
        navigate('/login');
        return;
      }
      
      const response = await fetch(`${API_URL}/api/conversations`, {
        ...defaultFetchOptions,
        method: 'GET',
        headers: {
          ...defaultFetchOptions.headers,
          'Authorization': userId,
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Handle unauthorized access by redirecting to login
          localStorage.clear();
          navigate('/login');
          return;
        }
        throw new Error('Failed to fetch conversations');
      }
      
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Failed to load conversations');
    }
  };

  const fetchConversationMessages = async (conversationId) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        console.warn('No userId found in localStorage, redirecting to login');
        navigate('/login');
        return;
      }
      
      const response = await fetch(`${API_URL}/api/conversations/${conversationId}`, {
        ...defaultFetchOptions,
        method: 'GET',
        headers: {
          ...defaultFetchOptions.headers,
          'Authorization': userId,
        }
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.clear();
          navigate('/login');
          return;
        }
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages(data.map(msg => ({
        sender: msg.role,
        text: msg.content
      })));
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages');
    }
  };

  const handleNewChat = () => {
    setSelectedConversationId(null);
    setMessages([{
      sender: 'assistant',
      text: "# Welcome to TME Services Virtual CIT Assistant\n\nI'm here to help you with UAE Corporate Income Tax questions. Upload your documents below or ask me anything to get started."
    }]);
    setInput('');
    setStreamedMessage('');
    setError(null);
    setWaitingForFirstToken(false);
    // Clear uploaded documents since they are conversation-specific
    setUploadedDocuments([]);
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversationId(conversation.id);
    // Clear uploaded documents since they are conversation-specific
    setUploadedDocuments([]);
  };

  const handleDeleteConversation = async (conversationId) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        navigate('/login');
        return;
      }
      
      const response = await fetch(`${API_URL}/api/conversations/${conversationId}`, {
        ...defaultFetchOptions,
        method: 'DELETE',
        headers: {
          ...defaultFetchOptions.headers,
          'Authorization': userId,
        }
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.clear();
          navigate('/login');
          return;
        }
        throw new Error('Failed to delete conversation');
      }
      
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      if (selectedConversationId === conversationId) {
        handleNewChat();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      setError('Failed to delete conversation');
    }
  };

  const handleEditConversation = async (conversationId, newTitle) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        navigate('/login');
        return;
      }
      
      const response = await fetch(`${API_URL}/api/conversations/${conversationId}`, {
        ...defaultFetchOptions,
        method: 'PUT',
        headers: {
          ...defaultFetchOptions.headers,
          'Authorization': userId,
        },
        body: JSON.stringify({
          title: newTitle
        })
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.clear();
          navigate('/login');
          return;
        }
        throw new Error('Failed to update conversation');
      }
      
      // Update the conversation in the local state
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, title: newTitle }
          : conv
      ));
    } catch (error) {
      console.error('Error updating conversation:', error);
      setError('Failed to update conversation title');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamedMessage]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = {
      sender: 'user',
      text: input
    };
  
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamedMessage('');
    setError(null);
    setWaitingForFirstToken(true);
  
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        navigate('/login');
        return;
      }
      
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Authorization': userId
        },
        mode: 'cors',
        body: JSON.stringify({
          message: input,
          conversationId: selectedConversationId,
          history: messages
        })
      });
  
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.clear();
          navigate('/login');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedMessage = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            const jsonStr = line.startsWith('data: ') ? line.slice(5) : line;
            const data = JSON.parse(jsonStr);
            
            if (data.type === 'conversation') {
              setSelectedConversationId(data.id);
              fetchConversations(); // Refresh conversation list
            } else if (data.type === 'content') {
              setWaitingForFirstToken(false);
              accumulatedMessage += data.content || '';
              setStreamedMessage(accumulatedMessage);
            } else if (data.type === 'error') {
              console.error('Server error:', data);
              const errorMessage = data.error || 'An unexpected error occurred';
              setError(errorMessage);
              setMessages(prev => [...prev, {
                sender: 'assistant',
                text: `I apologize, but I encountered an error: ${errorMessage}. Please try again or contact support if the issue persists.`
              }]);
              break;
            } else if (data.type === 'done') {
              setMessages(prevMessages => [...prevMessages, {
                sender: 'assistant',
                text: accumulatedMessage
              }]);
              setStreamedMessage('');
              fetchConversations(); // Refresh conversation list
            }
          } catch (parseError) {
            console.warn('Error parsing SSE data:', parseError, 'Line:', line);
            continue;
          }
        }
      }
    } catch (error) {
      setWaitingForFirstToken(false);
      console.error('Chat error:', error);
      setError('Failed to send message. Please try again.');
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: "I apologize, but I encountered an error. Please try again or contact support if the issue persists."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLogout = () => {
    // Clear all authentication data
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('loginTime');
    
    // Redirect to login page
    navigate('/login');
  };

  // Add this function to create a new conversation and return its id
  const handleRequireConversation = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        navigate('/login');
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`${API_URL}/api/conversations`, {
        ...defaultFetchOptions,
        method: 'POST',
        headers: {
          ...defaultFetchOptions.headers,
          'Authorization': userId,
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.clear();
          navigate('/login');
          throw new Error('Authentication required');
        }
        throw new Error('Failed to create conversation');
      }
      
      const data = await response.json();
      setSelectedConversationId(data.id);
      setConversations(prev => [...prev, data]);
      return data.id;
    } catch (error) {
      setError('Failed to create conversation for upload');
      throw error;
    }
  };

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        conversations={conversations}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onEditConversation={handleEditConversation}
        selectedConversationId={selectedConversationId}
        onLogout={handleLogout}
      />
      
      <div 
        className="flex-1 flex flex-col relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-20 border-4 border-dashed border-blue-400 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-8 shadow-lg text-center">
              <Upload className="w-16 h-16 mx-auto text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your files here</h3>
              <p className="text-gray-600">Supports PDF, CSV, and Excel files (max 10MB each)</p>
            </div>
          </div>
        )}

        <div className="border-b px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">TME Services Virtual CIT Assistant</h1>
        </div>

        {/* Show conversation view when there are messages beyond the welcome message or when conversation is selected */}
        {(messages.length > 1 || streamedMessage || waitingForFirstToken) ? (
          <>
            <div className="flex-1 overflow-y-auto">
              {/* Document Viewer - Show when documents are uploaded */}
              {uploadedDocuments.length > 0 && (
                <div className="bg-blue-50 border-b p-4">
                  <div className="max-w-4xl mx-auto">
                    <DocumentViewer documents={uploadedDocuments} />
                  </div>
                </div>
              )}

              <div className="w-full max-w-3xl mx-auto px-4 py-6">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {messages.map((message, index) => (
                  <div key={index} className="mb-8">
                    <div className={`${message.sender === 'user' ? 'ml-12' : 'mr-12'}`}>
                      <div className={`${
                        message.sender === 'user' 
                          ? 'bg-blue-600 text-white ml-auto' 
                          : 'bg-white text-gray-900'
                      } rounded-2xl px-6 py-4 shadow-sm border border-gray-100`}>
                        <div className="prose prose-sm max-w-none">
                          {message.sender === 'user' ? (
                            <p className="text-white m-0">{message.text}</p>
                          ) : (
                            <div className="prose-headings:text-gray-900 prose-p:text-gray-800 prose-p:leading-relaxed">
                              <ReactMarkdown>{message.text}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Upload progress indicator */}
                {isUploading && (
                  <div className="mb-6">
                    <div className="flex bg-blue-50 rounded-xl py-4 px-6 border border-blue-100">
                      <div className="w-full flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="text-blue-800">Uploading and processing your document...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {waitingForFirstToken && (
                  <div className="mb-6">
                    <div className="mr-12">
                      <div className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100">
                        <div className="flex items-center space-x-2 text-gray-500">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                          <span className="text-sm">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {streamedMessage && (
                  <div className="mb-6">
                    <div className="mr-12">
                      <div className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100">
                        <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-800 prose-p:leading-relaxed">
                          <ReactMarkdown>{streamedMessage}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {error && (
                  <div className="mb-6 px-6 py-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
                    {error}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="border-t border-gray-100 p-4 bg-white">
              <div className="max-w-3xl mx-auto">
                <div className="relative flex items-end rounded-2xl border border-gray-200 bg-white shadow-sm focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-300">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask anything..."
                    className="flex-1 px-4 py-4 bg-transparent focus:outline-none resize-none overflow-hidden text-gray-900 placeholder-gray-400"
                    rows="1"
                    disabled={isLoading}
                  />
                  <div className="flex items-center space-x-1 px-2 pb-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      title="Upload files"
                      disabled={isUploading}
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={isLoading || !input.trim()}
                      className={`p-2 rounded-lg transition-colors ${
                        input.trim() && !isLoading
                          ? 'text-white bg-blue-600 hover:bg-blue-700'
                          : 'text-gray-300 bg-gray-100'
                      }`}
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-center text-gray-400 mt-3">
                  TME Services Virtual CIT Assistant can make mistakes. Verify important information with our tax consultants.
                </p>
              </div>
            </div>
          </>
        ) : (
          /* Welcome screen with centered input */
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 bg-gray-50">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="w-full max-w-2xl mx-auto text-center">
              {/* Welcome Message */}
              <div className="mb-12">
                <h1 className="text-4xl font-bold text-gray-900 mb-6">
                  Welcome to TME Services Virtual CIT Assistant
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed">
                  I'm here to help you with UAE Corporate Income Tax questions. Upload your documents below or ask me anything to get started.
                </p>
              </div>

              {/* Upload progress indicator */}
              {isUploading && (
                <div className="mb-6">
                  <div className="flex bg-blue-50 rounded-xl py-4 px-6 border border-blue-100">
                    <div className="w-full flex items-center justify-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="text-blue-800">Uploading and processing your document...</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-6 px-6 py-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
                  {error}
                </div>
              )}

              {/* Show uploaded documents in a more integrated way */}
              {uploadedDocuments.length > 0 && (
                <div className="mb-8">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-800 font-medium">
                        {uploadedDocuments.length} document{uploadedDocuments.length > 1 ? 's' : ''} uploaded successfully
                      </span>
                    </div>
                    <div className="text-sm text-green-700">
                      {uploadedDocuments.map((doc, index) => (
                        <div key={index} className="flex items-center justify-center space-x-1">
                          <span>📄</span>
                          <span>{doc.name}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      You can now ask questions about the content in these documents.
                    </p>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="relative flex items-end rounded-2xl border border-gray-200 bg-white shadow-lg focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-300 focus-within:ring-opacity-20">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask anything..."
                  className="flex-1 px-6 py-4 bg-transparent focus:outline-none resize-none overflow-hidden text-gray-900 placeholder-gray-400 text-base"
                  rows="1"
                  disabled={isLoading}
                />
                <div className="flex items-center space-x-2 px-3 pb-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    title="Upload files"
                    disabled={isUploading}
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className={`p-2 rounded-lg transition-colors ${
                      input.trim() && !isLoading
                        ? 'text-white bg-blue-600 hover:bg-blue-700'
                        : 'text-gray-300 bg-gray-100'
                    }`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-400 mt-4">
                TME Services Virtual CIT Assistant can make mistakes. Verify important information with our tax consultants.
              </p>
            </div>

            {/* Decorative curved line similar to the screenshot */}
            <div className="absolute bottom-0 right-0 w-96 h-96 pointer-events-none">
              <svg
                viewBox="0 0 400 400"
                className="w-full h-full text-blue-500 opacity-20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M400 0C400 220.914 220.914 400 0 400"
                  stroke="currentColor"
                  strokeWidth="3"
                />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxChatUI;