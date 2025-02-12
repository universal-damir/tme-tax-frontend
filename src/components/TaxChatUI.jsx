import React, { useState, useRef, useEffect } from 'react';
import { Send, MoreVertical } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import API_URL from '../config';

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
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

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
  
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamedMessage('');
    setError(null);
  
    try {
      console.log('Sending request to:', `${API_URL}/api/chat`);
      
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          history: messages.map(msg => ({
            sender: msg.sender,
            text: msg.text
          }))
        })
      });
  
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server error:', response.status, errorData);
        throw new Error(`Server error: ${response.status}. ${errorData}`);
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
        console.log('Received chunk:', chunk); // Debug log
        
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            // Remove 'data: ' prefix if it exists
            const jsonStr = line.startsWith('data: ') ? line.slice(5) : line;
            const data = JSON.parse(jsonStr);
            
            if (data.type === 'content') {
              accumulatedMessage += data.content || '';
              setStreamedMessage(accumulatedMessage);
            } else if (data.type === 'error') {
              throw new Error(data.message || data.error);
            } else if (data.type === 'done') {
              setMessages(prevMessages => [...prevMessages, {
                sender: 'assistant',
                text: accumulatedMessage
              }]);
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
      setMessages(prevMessages => [...prevMessages, {
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

  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">TME Services Virtual Tax Assistant</h1>
          <button className="md:hidden p-2 hover:bg-gray-100 rounded-md">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
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
              TME Services Virtual Assistant can make mistakes. Verify important information with our tax consultants.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxChatUI;