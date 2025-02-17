import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, MoreVertical, MessageSquare, Plus, LogOut } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Replace the in-memory cache with localStorage
const getCacheKeyForUser = (username) => {
  return `tax_chat_cache_${username || 'anonymous'}`;
};

const getLastFetchKeyForUser = (username) => {
  return `tax_chat_last_fetch_${username || 'anonymous'}`;
};

// Helper functions for chat cache
const getChatCache = (token, username) => {
  if (!token || !username) return null;
  
  try {
    const cacheKey = getCacheKeyForUser(username);
    const cache = localStorage.getItem(cacheKey);
    return cache ? JSON.parse(cache) : null;
  } catch (e) {
    return null;
  }
};

const setChatCache = (data, token, username) => {
  if (!token || !username) return;
  
  try {
    const cacheKey = getCacheKeyForUser(username);
    const lastFetchKey = getLastFetchKeyForUser(username);
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(lastFetchKey, Date.now().toString());
  } catch (e) {
    // Silent error handling for cache operations
  }
};

const getLastFetchTime = (token, username) => {
  if (!token || !username) return 0;
  const lastFetchKey = getLastFetchKeyForUser(username);
  return parseInt(localStorage.getItem(lastFetchKey) || '0');
};

const TaxChatUI = () => {
  const { token, user, logout, isInitialized } = useAuth();
  const navigate = useNavigate();
  
  const [chats, setChats] = useState(() => {
    if (!token || !user) return [];
    const cachedChats = getChatCache(token, user);
    return cachedChats || [];
  });
  const [activeChat, setActiveChat] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true); // Start with loading true
  const [streamedMessage, setStreamedMessage] = useState('');
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [waitingForFirstToken, setWaitingForFirstToken] = useState(false);
  const fetchTimeoutRef = useRef(null);
  const isMounted = useRef(true);
  const hasInitialFetch = useRef(false);

  const fetchChats = useCallback(async (force = false) => {
    if (!token || !user || !isMounted.current) {
      setIsLoadingChats(false);
      return;
    }

    // Check cache first unless force refresh is requested
    if (!force) {
      const cachedData = getChatCache(token, user);
      if (cachedData && cachedData.length > 0) {
        setChats(cachedData);
        setIsLoadingChats(false);
        hasInitialFetch.current = true;
        return;
      }
    }

    setIsLoadingChats(true);

    try {
      const response = await fetch(`${API_URL}/api/chats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chats: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!isMounted.current) return;

      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected an array');
      }
      
      const sortedChats = data.sort((a, b) => 
        new Date(b.updated_at) - new Date(a.updated_at)
      );

      if (isMounted.current) {
        setChats(sortedChats);
        setChatCache(sortedChats, token, user);
        setError(null);
        hasInitialFetch.current = true;
      }
    } catch (error) {
      if (isMounted.current) {
        setError('Failed to load chat history');
        const cachedData = getChatCache(token, user);
        setChats(cachedData || []);
      }
    } finally {
      if (isMounted.current) {
        setIsLoadingChats(false);
      }
    }
  }, [token, user]);

  const handleLogout = useCallback(() => {
    if (token && user && chats.length > 0) {
      setChatCache(chats, token, user);
    }
    setChats([]);
    setActiveChat(null);
    setStreamedMessage('');
    setError(null);
    hasInitialFetch.current = false;
    logout();
    navigate('/login');
  }, [logout, navigate, token, user, chats]);

  const handleNewChat = useCallback(() => {
    setActiveChat(null);
    setInput('');
    setStreamedMessage('');
    setError(null);
    setWaitingForFirstToken(false);
    // Force fetch chats when creating new chat
    fetchChats(true);
  }, [fetchChats]);

  // Update the initialization effect
  useEffect(() => {
    if (isInitialized) {
      if (token && user) {
        const cachedData = getChatCache(token, user);
        if (cachedData && cachedData.length > 0) {
          // Ensure all chats have a messages array
          const validCachedData = cachedData.map(chat => ({
            ...chat,
            messages: chat.messages || []
          }));
          setChats(validCachedData);
          setIsLoadingChats(false);
          hasInitialFetch.current = true;
          
          // Create a new chat instead of restoring the last active one
          handleNewChat();
        } else {
          fetchChats(true);
        }
      } else {
        setChats([]);
        setActiveChat(null);
        setIsLoadingChats(false);
        hasInitialFetch.current = false;
      }
    }
  }, [isInitialized, token, user, fetchChats, handleNewChat]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages, streamedMessage, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Add effect to handle chat updates and sync with cache
  useEffect(() => {
    if (token && user && chats.length > 0) {
      setChatCache(chats, token, user);
    }
  }, [chats, token, user]);

  const fetchChat = useCallback(async (chatId) => {
    try {
      const response = await fetch(`${API_URL}/api/chats/${chatId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch chat');
      const messages = await response.json();
      return messages;
    } catch (error) {
      setError('Failed to load chat');
      return null;
    }
  }, [token]);

  const handleChatSelect = useCallback(async (chat) => {
    if (!chat) return;
    
    try {
      setIsLoading(true);
      setError(null);
      setStreamedMessage('');
      
      // First check if we have cached messages
      const cachedChat = chats.find(c => c.id === chat.id);
      if (cachedChat?.messages?.length > 0) {
        setActiveChat(cachedChat);
        setIsLoading(false);
        return;
      }
      
      // If no cached messages, fetch from server
      const messages = await fetchChat(chat.id);
      
      if (messages && isMounted.current) {
        const updatedChat = {
          ...chat,
          messages: messages
        };
        
        // Update the active chat
        setActiveChat(updatedChat);
        
        // Update the chat in the list and cache
        setChats(prevChats => {
          const updatedChats = prevChats.map(c => 
            c.id === chat.id ? updatedChat : c
          );
          // Update cache with the full updated chat list
          setChatCache(updatedChats, token, user);
          return updatedChats;
        });
      }
    } catch (error) {
      setError('Failed to load chat messages');
      setActiveChat(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchChat, chats, token, user]);

  const updateActiveChatMessages = useCallback((newMessage) => {
    if (activeChat) {
      setActiveChat(prev => {
        const updatedMessages = [...(prev.messages || []), newMessage];
        const updatedChat = {
          ...prev,
          messages: updatedMessages
        };
        
        // Update chats list and cache atomically
        setChats(prevChats => {
          const updatedChats = prevChats.map(chat => 
            chat.id === prev.id 
              ? { 
                  ...chat, 
                  messages: updatedMessages,
                  title: chat.title || updatedMessages[0]?.content.slice(0, 50) || 'New Chat'
                }
              : chat
          );
          // Update cache with the full updated chat list
          setChatCache(updatedChats, token, user);
          return updatedChats;
        });
        
        return updatedChat;
      });
    }
  }, [activeChat, token, user]);

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;
    
    const currentInput = input.trim();
    const startTime = performance.now();
    console.time('message-processing');
    console.log('[Performance] Starting message processing');
    console.log('[Debug] API URL:', API_URL);
    
    setInput('');
    setIsLoading(true);
    setError(null);
    setWaitingForFirstToken(true);
    setStreamedMessage('');

    // Add user message immediately
    const userMessage = { role: 'user', content: currentInput };
    
    // Create or update chat immediately for better UX
    let isNewChat = !activeChat;
    if (isNewChat) {
      const newChat = {
        id: null,
        messages: [userMessage],
        title: currentInput.slice(0, 50),
        temp: true
      };
      setActiveChat(newChat);
    } else {
      setActiveChat(prev => ({
        ...prev,
        messages: [...(prev.messages || []), userMessage]
      }));
    }

    // Update chats list with the new chat
    if (isNewChat) {
      setChats(prevChats => {
        const newChat = {
          id: null,
          messages: [userMessage],
          title: currentInput.slice(0, 50),
          temp: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        return [newChat, ...prevChats];
      });
    } else if (activeChat) {
      // Update the existing chat in the list with the new user message
      setChats(prevChats => {
        return prevChats.map(chat => {
          if (chat && activeChat && chat.id === activeChat.id) {
            return {
              ...chat,
              messages: [...(chat.messages || []), userMessage],
              updated_at: new Date().toISOString()
            };
          }
          return chat;
        });
      });
    }
  
    // Create AbortController for timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn('[Performance] Request timeout after 45s');
      abortController.abort();
    }, 45000);

    const maxRetries = 2;
    let retryCount = 0;

    const attemptFetch = async () => {
      try {
        console.log(`[Performance] Making API request (attempt ${retryCount + 1}) at ${performance.now() - startTime}ms`);
        console.log('[Debug] Request payload:', {
          message: currentInput,
          chatId: activeChat?.id || null
        });
        
        const requestStart = performance.now();

        // Test connection first
        const healthCheck = await fetch(`${API_URL}/api/health`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!healthCheck.ok) {
          throw new Error('Server is not responding to health check');
        }

        console.log('[Debug] Health check passed, proceeding with chat request');

        // Direct connection to chat endpoint with EventStream
        const response = await fetch(`${API_URL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify({
            message: currentInput,
            chatId: activeChat?.id || null
          }),
          signal: abortController.signal
        });

        const requestDuration = performance.now() - requestStart;
        console.log(`[Performance] Network request took ${requestDuration}ms`);
        console.log('[Debug] Response object:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          type: response.type,
          bodyUsed: response.bodyUsed
        });
    
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Chat endpoint not found. Please check if the server is running.');
          }
          if (response.status === 401 || response.status === 403) {
            throw new Error('Authentication failed. Please try logging in again.');
          }
          const errorText = await response.text().catch(() => 'No error details available');
          console.error('[Debug] Error response:', errorText);
          throw new Error(`Server error (${response.status}): ${errorText}`);
        }
    
        if (!response.body) {
          throw new Error('Server response format not supported. Please try again.');
        }
    
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let firstTokenReceived = false;
        let newChatId = null;
        let assistantMessage = { role: 'assistant', content: '' };
        
        // Get current messages before streaming starts
        const initialMessages = activeChat?.messages || [];
        // Ensure the current user message is in the initial messages
        if (!initialMessages.some(msg => msg.role === 'user' && msg.content === currentInput)) {
          initialMessages.push(userMessage);
        }
        
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            console.log('[Debug] Stream complete');
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          console.log(`[Debug] Received chunk:`, chunk);
          
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            
            try {
              const jsonStr = line.startsWith('data: ') ? line.slice(5) : line;
              console.log('[Debug] Processing line:', jsonStr);
              const data = JSON.parse(jsonStr);
              
              if (data.type === 'content') {
                if (!firstTokenReceived) {
                  firstTokenReceived = true;
                  setWaitingForFirstToken(false);
                  console.log('[Debug] First token received');
                }
                
                assistantMessage.content += data.content || '';
                
                // Show all messages including the streaming one
                const currentMessages = [...initialMessages];
                if (assistantMessage.content) {
                  // Only add the assistant message if it's not already there
                  if (!currentMessages.some(msg => msg.role === 'assistant' && msg.content === assistantMessage.content)) {
                    currentMessages.push({ ...assistantMessage });
                  }
                }
                
                setActiveChat(prev => ({
                  ...prev,
                  messages: currentMessages
                }));
                
                if (data.chatId && (!activeChat?.id || activeChat?.temp)) {
                  newChatId = data.chatId;
                  setActiveChat(prev => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      id: data.chatId,
                      temp: false,
                      messages: currentMessages
                    };
                  });
                  
                  // Update the chat in the list
                  setChats(prevChats => {
                    if (!prevChats) return [];
                    
                    const updatedChats = prevChats.map(chat => {
                      if (!chat) return chat;
                      if (chat.temp && (!chat.id || (activeChat && chat.id === activeChat.id))) {
                        return {
                          ...chat,
                          id: data.chatId,
                          temp: false,
                          messages: currentMessages
                        };
                      }
                      return chat;
                    }).filter(Boolean);
                    
                    return updatedChats;
                  });
                }
              } else if (data.type === 'error') {
                console.error('[Debug] Server sent error:', data.error);
                throw new Error(data.error || 'An unexpected error occurred');
              } else if (data.type === 'status') {
                console.log('[Debug] Status update:', data.message);
              }
            } catch (parseError) {
              console.error('[Debug] Failed to parse line:', line, parseError);
              throw new Error('Failed to parse server response. Please try again.');
            }
          }
        }

        // After stream is complete, ensure all messages are preserved
        const finalAssistantMessage = { ...assistantMessage };
        // Create final messages array with both questions and answers
        const finalMessages = [...initialMessages];
        // Only add the final assistant message if it's not already in the messages
        if (!finalMessages.some(msg => msg.role === 'assistant' && msg.content === finalAssistantMessage.content)) {
          finalMessages.push(finalAssistantMessage);
        }
        
        if (activeChat) {
          // Update active chat with all messages
          setActiveChat(prev => {
            if (!prev) return null;
            return {
              ...prev,
              messages: finalMessages
            };
          });

          // Update the chat in the list with all messages
          setChats(prevChats => {
            if (!prevChats) return [];
            
            const updatedChats = prevChats.map(chat => {
              if (!chat) return chat;
              if ((!chat.id && !activeChat.id) || (chat.id && activeChat.id && chat.id === activeChat.id)) {
                return {
                  ...chat,
                  messages: finalMessages,
                  updated_at: new Date().toISOString()
                };
              }
              return chat;
            }).filter(Boolean);
            
            return updatedChats;
          });
        }

        // After stream is complete, fetch updated chat list
        if (newChatId || isNewChat) {
          await fetchChats(true);
        }
        
        return true; // Success
      } catch (error) {
        console.error(`[Debug] Request attempt ${retryCount + 1} failed:`, error);
        
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }

        if (error.message?.includes('operation timed out')) {
          const operation = error.message.split(' ')[0];
          throw new Error(`${operation} is taking longer than expected. Please try again.`);
        }
        
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`[Debug] Retrying request (attempt ${retryCount + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          return attemptFetch();
        }
        
        throw error;
      }
    };

    try {
      await attemptFetch();
    } catch (error) {
      console.error('[Debug] All retry attempts failed:', error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        setError('Network connection error. Please check your internet connection.');
      } else {
        setError(error.message || 'Failed to send message. Please try again.');
      }
      setWaitingForFirstToken(false);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
      setWaitingForFirstToken(false);
      console.timeEnd('message-processing');
    }
  }, [token, input, activeChat, fetchChats]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const MessageContent = useMemo(() => ({ text }) => (
    <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-800">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  ), []);

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-64' : 'w-0'} border-r bg-gray-50 transition-all duration-300 overflow-hidden flex flex-col`}>
        <div className="p-4 border-b">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoadingChats ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : Array.isArray(chats) && chats.length > 0 ? (
            chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => handleChatSelect(chat)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-100 transition-colors ${
                  activeChat?.id === chat.id ? 'bg-gray-100' : ''
                }`}
              >
                <MessageSquare className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700 truncate">
                  {chat.title || `Chat ${chat.id}`}
                </span>
              </button>
            ))
          ) : (
            <div className="p-4 text-sm text-gray-500 text-center">
              No chat history yet
            </div>
          )}
        </div>
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">TME Services Virtual Tax Assistant</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6">
            {isLoading && (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            {activeChat?.messages && activeChat.messages.length > 0 ? (
              activeChat.messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className="mb-6">
                  <div className={`flex ${message.role === 'assistant' ? 'bg-blue-50' : 'bg-white'} rounded-lg py-4 px-6`}>
                    <div className="w-full">
                      <div className="text-gray-900">
                        <MessageContent text={message.content} />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : !isLoading && activeChat ? (
              <div className="text-center text-gray-600">
                No messages in this chat yet.
              </div>
            ) : null}
            {!activeChat && !streamedMessage && !isLoading && (
              <div className="text-center text-gray-600">
                Start a new conversation by typing a message below.
              </div>
            )}
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
              TME Services Virtual Assistant can make mistakes. Verify important information with our tax consultants.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxChatUI;