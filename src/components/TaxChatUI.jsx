import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { API_URL, defaultFetchOptions } from '../config';
import Sidebar from './Sidebar';
import FileUpload from './FileUpload';
import DocumentViewer from './DocumentViewer';
import { useNavigate } from 'react-router-dom';

const TaxChatUI = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([{
    sender: 'assistant',
    text: "## Welcome to TME Services Virtual CIT Assistant\n\nI'm here to help you with questions about UAE Corporate Income Tax.\n\nYou can upload PDF, CSV, or Excel files to get personalized tax calculations and advice based on your documents.\n\nHow can I assist you today?"
  }]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamedMessage, setStreamedMessage] = useState('');
  const [error, setError] = useState(null);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [waitingForFirstToken, setWaitingForFirstToken] = useState(false);

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
      text: "## Welcome to TME Services Virtual Tax Assistant\n\nI'm here to help you with questions about UAE tax.\n\nYou can upload PDF, CSV, or Excel files to get personalized tax calculations and advice based on your documents.\n\nHow can I assist you today?"
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

  const MessageContent = ({ text }) => (
    <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-800">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );

  const handleLogout = () => {
    // Clear all authentication data
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('loginTime');
    
    // Redirect to login page
    navigate('/login');
  };

  // File upload handlers
  const handleUploadSuccess = (fileInfo) => {
    setUploadedDocuments(prev => [...prev, fileInfo]);
    setError(null);
    
    // Add a message to the chat about the successful upload
    const uploadMessage = {
      sender: 'assistant',
      text: `✅ **Document uploaded successfully!**\n\n**${fileInfo.name}** (${fileInfo.type}) has been processed and is now available for analysis in this conversation. You can ask me questions about this document and I'll use its content to provide more accurate tax advice.\n\n*Note: Documents are specific to this conversation and won't be available in other chats.*`
    };
    setMessages(prev => [...prev, uploadMessage]);
  };

  const handleUploadError = (errorMessage) => {
    setError(`Upload failed: ${errorMessage}`);
  };

  const toggleFileUpload = () => {
    setShowFileUpload(!showFileUpload);
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
      
      <div className="flex-1 flex flex-col">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">TME Services Virtual CIT Assistant</h1>
          <button
            onClick={toggleFileUpload}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors
              ${showFileUpload 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }
            `}
            title="Upload documents"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">
              {showFileUpload ? 'Hide Upload' : 'Upload Files'}
            </span>
          </button>
        </div>

        {/* File Upload Section */}
        {showFileUpload && (
          <div className="border-b bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Document Upload</h2>
                <p className="text-sm text-gray-600">
                  Upload your financial documents (PDF, CSV, Excel) to get personalized tax calculations and advice.
                </p>
              </div>
              <FileUpload 
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                conversationId={selectedConversationId}
                onRequireConversation={handleRequireConversation}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* Document Viewer - Show when documents are uploaded */}
          {uploadedDocuments.length > 0 && (
            <div className="bg-blue-50 border-b p-4">
              <div className="max-w-4xl mx-auto">
                <DocumentViewer documents={uploadedDocuments} />
              </div>
            </div>
          )}

          <div className="max-w-2xl mx-auto px-4 py-6">
            {messages.map((message, index) => (
              <div key={index} className="mb-6">
                <div className={`flex ${message.sender === 'assistant' ? 'bg-blue-50' : 'bg-white'} rounded-lg py-4 px-6`}>
                  <div className="w-full">
                    <div className="text-gray-900">
                      <MessageContent text={message.text} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {waitingForFirstToken && (
              <div className="mb-6">
                <div className="flex bg-blue-50 rounded-lg py-4 px-6">
                  <div className="w-full">
                    <div className="text-gray-900">
                      <span className="inline-flex items-center">
                        <span className="animate-pulse">...</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {streamedMessage && (
              <div className="mb-6">
                <div className="flex bg-blue-50 rounded-lg py-4 px-6">
                  <div className="w-full">
                    <div className="text-gray-900">
                      <MessageContent text={streamedMessage} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="mb-6 px-4 py-2 bg-red-100 text-red-700 rounded-lg">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t p-4">
          <div className="max-w-2xl mx-auto">
            <div className="relative flex items-center rounded-xl border border-gray-300 bg-white shadow-sm">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Message TME Tax Assistant..."
                className="flex-1 px-4 py-3 bg-transparent focus:outline-none resize-none overflow-hidden"
                rows="1"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className={`p-2 mx-2 rounded-lg transition-colors ${
                  input.trim() && !isLoading
                    ? 'text-white bg-blue-600 hover:bg-blue-700'
                    : 'text-gray-400 bg-gray-100'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-center text-gray-600 mt-2">
              TME Services Virtual CIT Assistant can make mistakes. Verify important information with our tax consultants.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxChatUI;