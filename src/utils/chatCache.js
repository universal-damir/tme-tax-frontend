import Logger from './logger';

const getCacheKeyForUser = (username) => `tax_chat_cache_${username || 'anonymous'}`;
const getLastFetchKeyForUser = (username) => `tax_chat_last_fetch_${username || 'anonymous'}`;

class ChatCache {
  static getChats(token, username) {
    if (!token || !username) return null;
    
    try {
      const cacheKey = getCacheKeyForUser(username);
      const cache = localStorage.getItem(cacheKey);
      Logger.debug('Reading from cache', { key: cacheKey, value: cache });
      const parsedCache = cache ? JSON.parse(cache) : null;
      
      // Ensure each chat has a messages array and valid ID
      if (Array.isArray(parsedCache)) {
        return parsedCache
          .filter(chat => chat && chat.id) // Filter out invalid chats
          .map(chat => ({
            ...chat,
            // Ensure messages belong to this chat
            messages: Array.isArray(chat.messages) 
              ? chat.messages.filter(msg => msg.chat_id === chat.id)
              : [],
            updated_at: chat.updated_at || new Date().toISOString()
          }));
      }
      
      return null;
    } catch (error) {
      Logger.error('Error reading chat cache', error);
      return null;
    }
  }

  static setChats(data, token, username) {
    if (!token || !username) return;
    
    try {
      const cacheKey = getCacheKeyForUser(username);
      // Ensure we're storing valid chat objects
      const validChats = Array.isArray(data) ? data
        .filter(chat => chat && chat.id) // Filter out invalid chats
        .map(chat => ({
          ...chat,
          // Ensure messages belong to this chat
          messages: Array.isArray(chat.messages) 
            ? chat.messages.filter(msg => msg.chat_id === chat.id)
            : [],
          updated_at: chat.updated_at || new Date().toISOString()
        }))
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)) : [];
      
      Logger.debug('Writing to cache', { key: cacheKey, data: validChats });
      localStorage.setItem(cacheKey, JSON.stringify(validChats));
      this.setLastFetchTime(token, username);
    } catch (error) {
      Logger.error('Error setting chat cache', error);
    }
  }

  static getLastFetchTime(token, username) {
    if (!token || !username) return 0;
    const lastFetchKey = getLastFetchKeyForUser(username);
    return parseInt(localStorage.getItem(lastFetchKey) || '0');
  }

  static setLastFetchTime(token, username) {
    if (!token || !username) return;
    const lastFetchKey = getLastFetchKeyForUser(username);
    localStorage.setItem(lastFetchKey, Date.now().toString());
  }

  static clearCache(username) {
    const cacheKey = getCacheKeyForUser(username);
    const lastFetchKey = getLastFetchKeyForUser(username);
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(lastFetchKey);
  }

  static clearChatMessages(chatId, token, username) {
    if (!token || !username || !chatId) return;
    
    try {
      const cacheKey = getCacheKeyForUser(username);
      const cache = localStorage.getItem(cacheKey);
      const parsedCache = cache ? JSON.parse(cache) : null;
      
      if (Array.isArray(parsedCache)) {
        const updatedCache = parsedCache.map(chat => 
          chat.id === chatId ? { ...chat, messages: [] } : chat
        );
        localStorage.setItem(cacheKey, JSON.stringify(updatedCache));
      }
    } catch (error) {
      Logger.error('Error clearing chat messages from cache', error);
    }
  }
}

export default ChatCache; 