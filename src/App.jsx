import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import TaxChatUI from './components/TaxChatUI';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <TaxChatUI />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </Router>
    );
};

export default App; 