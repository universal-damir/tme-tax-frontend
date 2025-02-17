import { API_URL } from '../config';
import Logger from '../utils/logger';

class ChatService {
  static async fetchChats(token) {
    try {
      Logger.debug('Fetching chats from server');
      const response = await fetch(`${API_URL}/api/chats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chats: ${response.status}`);
      }
      
      const data = await response.json();
      Logger.debug('Received chats from server', data);
      return data;
    } catch (error) {
      Logger.error('Error fetching chats', error);
      throw error;
    }
  }

  static async fetchChat(chatId, token) {
    try {
      Logger.debug('Fetching messages for chat', { chatId });
      const response = await fetch(`${API_URL}/api/chats/${chatId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat');
      }
      
      const messages = await response.json();
      Logger.debug('Fetched messages', messages);
      return messages;
    } catch (error) {
      Logger.error('Error fetching chat messages', error);
      throw error;
    }
  }

  static async sendMessage(message, chatId, token) {
    try {
      Logger.debug('Sending message to API', { message, chatId });
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          message,
          chatId: chatId || null
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      return response.body.getReader();
    } catch (error) {
      Logger.error('Error sending message', error);
      throw error;
    }
  }
}

export default ChatService; 