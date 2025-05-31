import React, { useState } from 'react';
import { PlusCircle, MessageSquare, Trash2, X, PenSquare, LogOut, Edit3, Check } from 'lucide-react';

const Sidebar = ({
  conversations = [],
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onEditConversation,
  selectedConversationId,
  onLogout,
  className = ''
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileAction = () => {
    if (conversations.length === 0) {
      onNewChat();
    } else {
      toggleMobileMenu();
    }
  };

  const handleStartEdit = (conversation) => {
    setEditingConversationId(conversation.id);
    setEditingTitle(conversation.title);
  };

  const handleSaveEdit = async () => {
    if (editingTitle.trim() && onEditConversation) {
      await onEditConversation(editingConversationId, editingTitle.trim());
    }
    setEditingConversationId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingConversationId(null);
    setEditingTitle('');
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  return (
    <>
      {/* Mobile Menu Button - Only visible on mobile */}
      <button
        onClick={handleMobileAction}
        className="lg:hidden fixed top-2 right-2 z-50 p-2 rounded-md hover:bg-gray-100"
        aria-label={conversations.length === 0 ? "New chat" : "Show conversations"}
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-gray-600" />
        ) : (
          <PenSquare className="w-6 h-6 text-gray-600" />
        )}
      </button>

      {/* Overlay - Only visible on mobile when menu is open */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white border-r border-gray-200 flex flex-col h-screen
          transform transition-transform duration-300 ease-in-out
          lg:transform-none
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          ${className}
        `}
      >
        {/* New Chat button - visible on both mobile and desktop */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => {
              onNewChat();
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`w-full text-left p-3 hover:bg-gray-50 flex items-start gap-3 transition-colors group border-b border-gray-100 ${
                selectedConversationId === conversation.id ? 'bg-gray-50' : ''
              }`}
            >
              <div 
                className="flex-1 min-w-0 cursor-pointer flex items-start gap-3"
                onClick={() => {
                  if (editingConversationId !== conversation.id) {
                    onSelectConversation(conversation);
                    setIsMobileMenuOpen(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (editingConversationId !== conversation.id && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onSelectConversation(conversation);
                    setIsMobileMenuOpen(false);
                  }
                }}
                role="button"
                tabIndex={editingConversationId === conversation.id ? -1 : 0}
              >
                <MessageSquare className="w-5 h-5 mt-1 flex-shrink-0 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    {editingConversationId === conversation.id ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        onBlur={handleSaveEdit}
                        className="text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                        aria-label="Edit conversation title"
                      />
                    ) : (
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {conversation.title}
                      </h3>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {editingConversationId === conversation.id ? (
                  <button
                    onClick={handleSaveEdit}
                    className="p-1.5 hover:bg-gray-100 rounded-md transition-opacity"
                    aria-label="Save conversation title"
                  >
                    <Check className="w-4 h-4 text-green-500" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(conversation);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Edit conversation title"
                  >
                    <Edit3 className="w-4 h-4 text-gray-400 hover:text-blue-500" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conversation.id);
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Logout button at the bottom */}
        <div className="p-4 border-t border-gray-200 mt-auto">
          <button
            onClick={() => {
              onLogout();
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar; 