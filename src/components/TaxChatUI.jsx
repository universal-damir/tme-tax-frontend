import React, { useState, useRef, useEffect } from 'react';
import { Send, MoreVertical, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Use your environment variable or a fallback
const API_URL = process.env.REACT_APP_API_URL || 'https://tme-tax-backend-production.up.railway.app';

const TaxChatUI = () => {
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: "## Welcome to TME Services Virtual Tax Assistant\n\nI'm here to help you with questions about UAE tax.\n\nHow can I assist you today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamedMessage, setStreamedMessage] = useState('');
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom when messages or streamed content update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamedMessage]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  /**
   * Check server connection status every 30 seconds (health endpoint).
   */
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_URL}/api/health`);
        setIsConnected(response.ok);
      } catch (error) {
        console.error('Connection check failed:', error);
        setIsConnected(false);
      }
    };

    checkConnection(); // Initial check
    const interval = setInterval(checkConnection, 30000); 
    return () => clearInterval(interval);
  }, []);

  /**
   * Sends the user message to the server via SSE and updates state accordingly.
   */
  const handleSend = async () => {
    // Prevent empty messages or multiple simultaneous sends
    if (!input.trim() || isLoading) return;

    // Create a local user message
    const userMessage = {
      sender: 'user',
      text: input.trim(),
    };

    // Immediately show the user's message in the chat
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamedMessage('');
    setError(null);

    try {
      // Make the SSE request to the server
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        mode: 'cors',         // Ensures CORS is used
        credentials: 'omit',  // Matches the server’s CORS config (credentials: false)
        body: JSON.stringify({
          message: userMessage.text,
          history: messages
        })
      });

      // Handle non-OK responses
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // The response body should be a ReadableStream for SSE
      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedMessage = '';

      // Continuously read SSE chunks from the server
      while (true) {
        const { value, done } = await reader.read();
        if (done) break; // End of stream

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          // Ignore empty lines
          if (line.trim() === '') continue;

          try {
            // Each SSE line starts with "data: " — remove it if present
            const jsonStr = line.startsWith('data: ') ? line.slice(5) : line;
            const data = JSON.parse(jsonStr);

            // Handling different SSE event types from the server
            if (data.type === 'content') {
              // Accumulate partial content
              accumulatedMessage += data.content || '';
              setStreamedMessage(accumulatedMessage);

            } else if (data.type === 'error') {
              // Stop reading and throw the error
              throw new Error(data.error || 'Unknown SSE error');

            } else if (data.type === 'done') {
              // Insert final assistant message with sources
              setMessages((prevMessages) => [
                ...prevMessages,
                {
                  sender: 'assistant',
                  text: accumulatedMessage,
                  sources: data.sources
                }
              ]);
              setStreamedMessage('');
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e, 'Line:', line);
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setError(error.message);
      // Display a fallback error message from the assistant
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: "I apologize, but I encountered an error. Please try again or contact support if the issue persists."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Send the message on Enter (without shift key).
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Message rendering component using ReactMarkdown
   * Adds "Sources" if present in the message data.
   */
  const MessageContent = ({ text, sources }) => (
    <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-800">
      <ReactMarkdown>{text}</ReactMarkdown>
      {sources && sources.length > 0 && (
        <div className="text-xs text-gray-500 mt-2">
          Sources: {sources.join(', ')}
        </div>
      )}
    </div>
  );

  /**
   * Renders an error page if the server is unreachable.
   */
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600">
            Unable to connect to the server. Please check your internet connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  /**
   * Main chat UI
   */
  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">
            TME Services Virtual Tax Assistant
          </h1>
          <button className="md:hidden p-2 hover:bg-gray-100 rounded-md">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6">
            {messages.map((message, index) => (
              <div key={index} className="mb-6">
                <div
                  className={`flex ${
                    message.sender === 'assistant' ? 'bg-blue-50' : 'bg-white'
                  } rounded-lg py-4 px-6`}
                >
                  <div className="w-full text-gray-900">
                    <MessageContent
                      text={message.text}
                      sources={message.sources}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Streamed Partial Assistant Message */}
            {streamedMessage && (
              <div className="mb-6">
                <div className="flex bg-blue-50 rounded-lg py-4 px-6">
                  <div className="w-full text-gray-900">
                    <MessageContent text={streamedMessage} />
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="mb-6 px-4 py-2 bg-red-100 text-red-700 rounded-lg">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input & Send Button */}
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
              TME Services Virtual Assistant can make mistakes. Verify important information with our tax consultants.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxChatUI;
