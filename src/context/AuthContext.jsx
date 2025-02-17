import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => {
        const savedToken = localStorage.getItem('auth_token');
        console.log('Initial token from localStorage:', savedToken);
        return savedToken;
    });
    const [user, setUser] = useState(() => localStorage.getItem('username'));
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        console.log('Token changed:', token);
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
        setIsInitialized(true);
    }, [token]);

    useEffect(() => {
        if (user) {
            localStorage.setItem('username', user);
        } else {
            localStorage.removeItem('username');
        }
    }, [user]);

    const login = (newToken, username) => {
        console.log('Login called with token:', newToken);
        setToken(newToken);
        setUser(username);
    };

    const logout = () => {
        console.log('Logout called');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('username');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ 
            token, 
            user, 
            login, 
            logout, 
            isAuthenticated: !!token, 
            isInitialized 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}; 