import { supabase } from './supabaseClient';

// ATENÇÃO: Este service é SOMENTE LEITURA para a tabela pepl_responsibles.
// O CRUD completo de responsáveis é gerenciado pela aplicação "gestao-pessoal".
// Consulte: /database-unico/GOVERNANCA.md para mais detalhes.

export const responsiblesService = {
    // Get all responsibles (active only by default)
    async getResponsibles(includeInactive = false) {
        let query = supabase
            .from('pepl_responsibles')
            .select('*')
            .order('name', { ascending: true });

        if (!includeInactive) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    // Get a responsible by ID
    async getResponsibleById(id) {
        const { data, error } = await supabase
            .from('pepl_responsibles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    // Get a responsible by email
    async getResponsibleByEmail(email) {
        const { data, error } = await supabase
            .from('pepl_responsibles')
            .select('*')
            .eq('email', email.toLowerCase())
            .maybeSingle();

        if (error) throw error;
        return data; // pode ser null se não encontrar
    },
};
