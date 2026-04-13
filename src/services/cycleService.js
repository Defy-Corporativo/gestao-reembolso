import { supabase } from './supabaseClient';

export const cycleService = {
    // Busca ciclo com status 'aberto'
    async getOpenCycle() {
        const { data, error } = await supabase
            .from('rebl_cycles')
            .select('*')
            .eq('status', 'aberto')
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    // Lista ciclos fechados ordenados por data de abertura (mais recente primeiro)
    async getClosedCycles() {
        const { data, error } = await supabase
            .from('rebl_cycles')
            .select('*')
            .eq('status', 'fechado')
            .order('opened_date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Cria novo ciclo com o mês de referência atual (YYYY-MM) e a data de abertura (hoje)
    async createCycle(referenceMonth) {
        const now = new Date();
        const openedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const { data, error } = await supabase
            .from('rebl_cycles')
            .insert({
                reference_month: referenceMonth,
                status: 'aberto',
                opened_date: openedDate,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Busca ou cria ciclo para o mês atual
    async getOrCreateCurrentCycle() {
        // Verifica se já existe ciclo aberto
        let cycle = await this.getOpenCycle();
        if (cycle) return cycle;

        // Cria novo ciclo com o mês atual
        const now = new Date();
        const referenceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return await this.createCycle(referenceMonth);
    },

    // Fecha um ciclo (chamado pelo Executivo Financeiro)
    // closedDate: string YYYY-MM-DD informada pelo financeiro (não pode ser futura)
    async closeCycle(cycleId, closedByResponsibleId, closedDate) {
        const { data, error } = await supabase
            .from('rebl_cycles')
            .update({
                status: 'fechado',
                closed_date: closedDate,
                closed_at: new Date().toISOString(),
                closed_by: closedByResponsibleId,
                updated_at: new Date().toISOString(),
            })
            .eq('id', cycleId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Busca ciclo por ID
    async getCycleById(cycleId) {
        const { data, error } = await supabase
            .from('rebl_cycles')
            .select('*')
            .eq('id', cycleId)
            .single();

        if (error) throw error;
        return data;
    },
};
