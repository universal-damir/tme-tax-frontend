import { useState, useCallback, useRef, useEffect } from 'react';
import ChatService from '../services/chatService';
import ChatCache from '../utils/chatCache';
import Logger from '../utils/logger';

export const useChat = (token, user) => {
  const [chats, setChats] = useState(() => {
    if (!token || !user) return [];
    const cachedChats = ChatCache.getChats(token, user);
    Logger.debug('Initializing chats from cache', cachedChats);
    return (cachedChats || [])
      .filter(chat => chat && (chat.id || chat.temp))
      .map(chat => ({
        ...chat,
        messages: chat.messages || []
      }));
  });

  const [activeChat, setActiveChat] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [error, setError] = useState(null);
  const [streamedMessage, setStreamedMessage] = useState('');
  const [waitingForFirstToken, setWaitingForFirstToken] = useState(false);
  
  const isMounted = useRef(true);
  const tempIdCounterRef = useRef(0);
  const hasInitialFetch = useRef(false);

  // Cleanup effect
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Generate temporary ID
  const generateTempId = useCallback(() => {
    tempIdCounterRef.current += 1;
    return `temp-${Date.now()}-${tempIdCounterRef.current}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Get chat key
  const getChatKey = useCallback((chat) => {
    if (!chat) return `empty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (chat.temp) return `temp-${chat.id}`;
    if (typeof chat.id === 'number') return `server-${chat.id}`;
    if (chat.id) return `chat-${chat.id}`;
    
    return `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Fetch chats
  const fetchChats = useCallback(async (force = false) => {
    Logger.debug('fetchChats called', { force, hasToken: !!token, user });
    
    if (!token || !user || !isMounted.current) {
      setIsLoadingChats(false);
      return;
    }

    if (!force) {
      const cachedData = ChatCache.getChats(token, user);
      if (cachedData?.length > 0) {
        Logger.debug('Using cached chats', cachedData);
        setChats(cachedData);
        setIsLoadingChats(false);
        hasInitialFetch.current = true;
        return;
      }
    }

    setIsLoadingChats(true);

    try {
      const data = await ChatService.fetchChats(token);
      
      if (!isMounted.current) return;
      if (!Array.isArray(data)) throw new Error('Invalid response format');
      
      const existingCache = ChatCache.getChats(token, user) || [];
      const existingMessagesMap = new Map(
        (existingCache || [])
          .filter(chat => chat && chat.id)
          .map(chat => [chat.id, chat.messages || []])
      );
      
      const mergedChats = await Promise.all(data.map(async (newChat) => {
        if (!existingMessagesMap.has(newChat.id)) {
          try {
            const messages = await ChatService.fetchChat(newChat.id, token);
            return { ...newChat, messages: messages || [] };
          } catch (error) {
            Logger.error(`Error fetching messages for chat ${newChat.id}`, error);
            return { ...newChat, messages: [] };
          }
        }
        return {
          ...newChat,
          messages: existingMessagesMap.get(newChat.id) || []
        };
      }));
      
      const sortedChats = mergedChats.sort((a, b) => 
        new Date(b.updated_at) - new Date(a.updated_at)
      );

      if (isMounted.current) {
        Logger.debug('Setting and caching sorted chats', sortedChats);
        setChats(sortedChats);
        ChatCache.setChats(sortedChats, token, user);
        setError(null);
        hasInitialFetch.current = true;
      }
    } catch (error) {
      Logger.error('Error in fetchChats', error);
      if (isMounted.current) {
        setError('Failed to load chat history');
        const cachedData = ChatCache.getChats(token, user);
        if (cachedData) {
          Logger.debug('Using cached data after fetch error', cachedData);
          setChats(cachedData);
        }
      }
    } finally {
      if (isMounted.current) {
        setIsLoadingChats(false);
      }
    }
  }, [token, user]);

  // Handle chat selection
  const handleChatSelect = useCallback(async (chat) => {
    if (!chat) {
      Logger.error('Attempted to select null chat');
      return;
    }

    try {
      Logger.debug('Selecting chat', chat);
      setIsLoading(true);
      setError(null);
      setStreamedMessage('');
      setActiveChat(chat);
      
      if (chat.id && (!chat.messages || chat.messages.length === 0)) {
        const messages = await ChatService.fetchChat(chat.id, token);
        
        if (messages && isMounted.current) {
          const updatedChat = { ...chat, messages };
          setActiveChat(updatedChat);
          
          setChats(prevChats => {
            const updatedChats = prevChats.map(c => 
              c && c.id === chat.id ? updatedChat : c
            ).filter(Boolean);
            ChatCache.setChats(updatedChats, token, user);
            return updatedChats;
          });
        }
      }
    } catch (error) {
      Logger.error('Error in handleChatSelect', error);
      setError('Failed to load chat messages');
      setActiveChat(null);
    } finally {
      setIsLoading(false);
    }
  }, [token, user]);

  // Create new chat
  const handleNewChat = useCallback(() => {
    Logger.debug('New chat initiated');
    const newChat = {
      id: generateTempId(),
      temp: true,
      title: 'New Chat',
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setActiveChat(newChat);
    setStreamedMessage('');
    setError(null);
    setWaitingForFirstToken(false);
    
    setChats(prevChats => {
      const updatedChats = [newChat, ...(prevChats || [])].filter(chat => chat && (chat.id || chat.temp));
      ChatCache.setChats(updatedChats, token, user);
      return updatedChats;
    });

    return newChat;
  }, [generateTempId, token, user]);

  // Update chat messages
  const updateActiveChatMessages = useCallback((newMessage) => {
    if (!activeChat) return;
    
    setActiveChat(prev => {
      if (!prev) return null;
      const updatedMessages = [...(prev.messages || []), newMessage];
      const updatedChat = { ...prev, messages: updatedMessages };
      
      setChats(prevChats => {
        const validPrevChats = (prevChats || []).filter(Boolean);
        const updatedChats = validPrevChats.map(chat => {
          if (!chat || !prev.id) return chat;
          if (chat.id === prev.id) {
            return { 
              ...chat, 
              messages: updatedMessages,
              title: chat.title || updatedMessages[0]?.content.slice(0, 50) || 'New Chat'
            };
          }
          return chat;
        }).filter(Boolean);
        
        ChatCache.setChats(updatedChats, token, user);
        return updatedChats;
      });
      
      return updatedChat;
    });
  }, [activeChat, token, user]);

  // Process stream data
  const processStreamData = useCallback(async (reader, currentChat, onFirstLine) => {
    const decoder = new TextDecoder();
    let accumulatedMessage = '';
    let firstLine = '';
    
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          // Return final result when stream is done
          return { accumulatedMessage, firstLine };
        }
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            const jsonStr = line.startsWith('data: ') ? line.slice(5) : line;
            const data = JSON.parse(jsonStr);
            Logger.debug('Received stream data', data);
            
            if (data.type === 'content') {
              setWaitingForFirstToken(false);
              accumulatedMessage += data.content || '';
              
              if (!firstLine && accumulatedMessage.trim()) {
                firstLine = accumulatedMessage.split('\n')[0].trim();
                onFirstLine?.(firstLine);
              }
              
              setStreamedMessage(accumulatedMessage);
            } else if (data.type === 'error') {
              throw new Error(data.error || 'An unexpected error occurred');
            } else if (data.type === 'done') {
              return { accumulatedMessage, firstLine };
            }
          } catch (parseError) {
            Logger.error('Error parsing stream chunk', parseError);
            // Continue processing other chunks even if one fails
            continue;
          }
        }
      }
    } catch (error) {
      Logger.error('Error processing stream', error);
      // Return empty result on error to prevent destructuring issues
      return { accumulatedMessage: '', firstLine: '' };
    }
  }, []);

  return {
    chats,
    activeChat,
    isLoading,
    isLoadingChats,
    error,
    streamedMessage,
    waitingForFirstToken,
    setChats,
    setActiveChat,
    setError,
    setStreamedMessage,
    setWaitingForFirstToken,
    setIsLoading,
    fetchChats,
    handleChatSelect,
    handleNewChat,
    updateActiveChatMessages,
    processStreamData,
    getChatKey,
  };
};

export default useChat; 