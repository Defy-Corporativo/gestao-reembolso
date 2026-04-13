import { supabase } from './supabaseClient';
import { storageService } from './storageService';
import { cycleService } from './cycleService';

export const requestService = {
    // Busca solicitações do usuário logado no ciclo especificado
    async getRequestsByUserAndCycle(responsibleId, cycleId) {
        const { data, error } = await supabase
            .from('rebl_requests')
            .select(`
                *,
                rebl_expense_types(id, name)
            `)
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
                pepl_responsibles!inner(id, name, email),
                rebl_expense_types(id, name)
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
    async createRequest({ responsibleId, expenseDate, amount, description, expenseTypeId, receiptFiles, userName }) {
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
                expense_type_id: expenseTypeId || null,
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

    // Atualiza uma solicitação existente (campos + comprovantes novos)
    // existingPaths: paths já salvos no storage que devem ser mantidos
    // newFiles: novos arquivos File para upload
    async updateRequest({ requestId, expenseDate, amount, description, expenseTypeId, existingPaths, newFiles, userName }) {
        // 1. Upload de novos comprovantes (índice sequencial continua após os existentes)
        const newPaths = [];
        for (let i = 0; i < newFiles.length; i++) {
            const path = await storageService.uploadReceipt(newFiles[i], userName, existingPaths.length + i + 1);
            newPaths.push(path);
        }

        const allPaths = [...existingPaths, ...newPaths];

        // 2. Atualizar a solicitação
        const { data, error } = await supabase
            .from('rebl_requests')
            .update({
                expense_date: expenseDate,
                amount: parseFloat(amount),
                description: description.trim(),
                receipt_paths: JSON.stringify(allPaths),
                expense_type_id: expenseTypeId || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', requestId)
            .eq('status', 'pendente') // Só permite editar se pendente
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Deleta uma solicitação (somente se pendente) e limpa arquivos do storage
    async deleteRequest(requestId) {
        // 1. Buscar a solicitação para obter os paths dos comprovantes
        const { data: req, error: fetchError } = await supabase
            .from('rebl_requests')
            .select('receipt_paths')
            .eq('id', requestId)
            .eq('status', 'pendente')
            .single();

        if (fetchError) throw fetchError;

        // 2. Remover arquivos do storage
        if (req?.receipt_paths) {
            try {
                const paths = JSON.parse(req.receipt_paths);
                if (Array.isArray(paths)) {
                    for (const p of paths) {
                        await storageService.deleteReceipt(p).catch(() => {}); // ignora falhas individuais
                    }
                }
            } catch {
                // receipt_paths pode não ser um JSON válido em dados legados
            }
        }

        // 3. Deletar a solicitação
        const { error } = await supabase
            .from('rebl_requests')
            .delete()
            .eq('id', requestId)
            .eq('status', 'pendente');

        if (error) throw error;
    },
};
