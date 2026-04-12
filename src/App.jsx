import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ReembolsoProvider } from './contexts/ReembolsoContext';
import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Reembolso from './components/reembolso/Reembolso';
import Historico from './components/historico/Historico';
import MeusPagamentos from './components/pagamentos/MeusPagamentos';
import GestaoFinanceira from './components/gestao/GestaoFinanceira';

const LoginRoute = () => {
    const { user } = useAuth();
    return user ? <Navigate to="/" replace /> : <Login />;
};

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<LoginRoute />} />
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <ReembolsoProvider>
                                    <MainLayout />
                                </ReembolsoProvider>
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Reembolso />} />
                        <Route path="historico" element={<Historico />} />
                        <Route path="pagamentos" element={<MeusPagamentos />} />
                        <Route path="gestao" element={<GestaoFinanceira />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
