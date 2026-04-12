import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { responsiblesService } from '../services/responsiblesService';
import { roleService } from '../services/roleService';
import { cycleService } from '../services/cycleService';

const ReembolsoContext = createContext({});

export const useReembolso = () => useContext(ReembolsoContext);

export const ReembolsoProvider = ({ children }) => {
    const { user } = useAuth();
    const [responsible, setResponsible] = useState(null);
    const [isExecutivoFinanceiro, setIsExecutivoFinanceiro] = useState(false);
    const [openCycle, setOpenCycle] = useState(null);
    const [loadingContext, setLoadingContext] = useState(true);

    useEffect(() => {
        if (user?.email) {
            loadContext();
        }
    }, [user?.email]);

    const loadContext = async () => {
        try {
            setLoadingContext(true);

            // 1. Buscar o responsável pelo email do usuário logado
            const resp = await responsiblesService.getResponsibleByEmail(user.email);
            setResponsible(resp);

            if (resp) {
                // 2. Verificar se tem papel de Executivo Financeiro
                const hasFinRole = await roleService.hasRole(resp.id, 'Executivo Financeiro');
                setIsExecutivoFinanceiro(hasFinRole);
            }

            // 3. Buscar ciclo aberto
            const cycle = await cycleService.getOpenCycle();
            setOpenCycle(cycle);
        } catch (err) {
            console.error('Erro ao carregar contexto de reembolso:', err);
        } finally {
            setLoadingContext(false);
        }
    };

    const refreshCycle = async () => {
        try {
            const cycle = await cycleService.getOpenCycle();
            setOpenCycle(cycle);
        } catch (err) {
            console.error('Erro ao atualizar ciclo:', err);
        }
    };

    const value = {
        responsible,
        isExecutivoFinanceiro,
        openCycle,
        loadingContext,
        refreshCycle,
        reloadContext: loadContext,
    };

    return (
        <ReembolsoContext.Provider value={value}>
            {children}
        </ReembolsoContext.Provider>
    );
};
