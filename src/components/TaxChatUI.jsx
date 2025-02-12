import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, MoreVertical } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Existing functionality remains the same
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

    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          history: messages
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
          if (line.trim() === '' || !line.startsWith('data: ')) continue;
          
          try {
            const data = JSON.parse(line.slice(5));
            
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
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prevMessages => [...prevMessages, {
        sender: 'assistant',
        text: "I apologize, but I encountered an error processing your request. Please try again."
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
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );

  return (
    <div className="flex h-screen bg-white">
      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="border-b px-4 py-3 flex items-center justify-between bg-white">
          <h1 className="text-lg font-medium text-gray-800">TME Services Virtual Tax Assistant</h1>
          <button className="md:hidden p-2 hover:bg-gray-100 rounded-md">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-2xl mx-auto px-4 py-6">
            {messages.map((message, index) => (
              <div key={index} className="mb-6">
                <div className={`flex ${message.sender === 'assistant' ? 'bg-gray-50' : 'bg-white'} py-6 px-4`}>
                  <div className="max-w-2xl mx-auto">
                    <div className={`text-gray-800 prose`}>
                      <MessageContent text={message.text} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {streamedMessage && (
              <div className="mb-6">
                <div className="flex bg-gray-50 py-6 px-4">
                  <div className="max-w-2xl mx-auto">
                    <div className="text-gray-800 prose">
                      <MessageContent text={streamedMessage} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t bg-white p-4">
          <div className="max-w-2xl mx-auto">
            <div className="relative flex items-center rounded-xl border border-gray-200 bg-white shadow-sm">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Message UAE Tax Assistant..."
                className="flex-1 px-4 py-3 bg-transparent focus:outline-none resize-none overflow-hidden"
                rows="1"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className={`p-2 mx-2 rounded-lg transition-colors ${
                  input.trim()
                    ? 'text-white bg-gray-900 hover:bg-gray-700'
                    : 'text-gray-300'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-center text-gray-500 mt-2">
              TME Services Virtual Assistant can make mistakes. Verify important information with our tax consultants.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxChatUI;