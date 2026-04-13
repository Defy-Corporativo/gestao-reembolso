import { supabase } from './supabaseClient';
import { storageService } from './storageService';
import { cycleService } from './cycleService';

export const requestService = {
    // Busca solicitações do usuário logado no ciclo especificado
    async getRequestsByUserAndCycle(responsibleId, cycleId) {
        const { data, error } = await supabase
            .from('rebl_requests')
            .select('*')
            .eq('responsible_id', responsibleId)
            .eq('cycle_id', cycleId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Busca todas as solicitações de um ciclo (para executivo financeiro)
    async getRequestsByCycle(cycleId) {
        const { data, error } = await supabase
            .from('rebl_requests')
            .select(`
                *,
                pepl_responsibles!inner(id, name, email)
            `)
            .eq('cycle_id', cycleId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Busca solicitações de um responsável específico em um ciclo
    async getRequestsByResponsibleAndCycle(responsibleId, cycleId) {
        const { data, error } = await supabase
            .from('rebl_requests')
            .select('*')
            .eq('responsible_id', responsibleId)
            .eq('cycle_id', cycleId)
            .order('expense_date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Cria uma nova solicitação de reembolso
    async createRequest({ responsibleId, expenseDate, amount, description, receiptFiles, userName }) {
        // 1. Buscar ou criar ciclo aberto
        const cycle = await cycleService.getOrCreateCurrentCycle();

        // 2. Upload de todos os comprovantes (número sequencial começa em 1)
        const receiptPaths = [];
        for (let i = 0; i < receiptFiles.length; i++) {
            const path = await storageService.uploadReceipt(receiptFiles[i], userName, i + 1);
            receiptPaths.push(path);
        }

        // 3. Criar a solicitação
        const { data, error } = await supabase
            .from('rebl_requests')
            .insert({
                cycle_id: cycle.id,
                responsible_id: responsibleId,
                expense_date: expenseDate,
                amount: parseFloat(amount),
                description: description.trim(),
                receipt_paths: JSON.stringify(receiptPaths),
                status: 'pendente',
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Atualiza status de uma ou mais solicitações
    async updateRequestStatus(requestIds, status) {
        const { data, error } = await supabase
            .from('rebl_requests')
            .update({
                status,
                updated_at: new Date().toISOString(),
            })
            .in('id', requestIds)
            .select();

        if (error) throw error;
        return data;
    },

    // Deleta uma solicitação (somente se pendente)
    async deleteRequest(requestId) {
        const { error } = await supabase
            .from('rebl_requests')
            .delete()
            .eq('id', requestId)
            .eq('status', 'pendente');

        if (error) throw error;
    },
};
