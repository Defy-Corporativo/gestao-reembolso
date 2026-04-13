import { supabase } from './supabaseClient';

export const expenseTypeService = {
    // Busca todos os tipos de despesa ativos (para o select do formulário)
    async getActiveExpenseTypes() {
        const { data, error } = await supabase
            .from('rebl_expense_types')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    // Busca todos os tipos de despesa (incluindo inativos, para gestão)
    async getAllExpenseTypes() {
        const { data, error } = await supabase
            .from('rebl_expense_types')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    // Cria um novo tipo de despesa
    async createExpenseType(name) {
        const { data, error } = await supabase
            .from('rebl_expense_types')
            .insert({ name: name.trim() })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Atualiza o nome de um tipo de despesa
    async updateExpenseType(id, name) {
        const { data, error } = await supabase
            .from('rebl_expense_types')
            .update({
                name: name.trim(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Ativa/desativa um tipo de despesa (soft delete)
    async toggleExpenseType(id, isActive) {
        const { data, error } = await supabase
            .from('rebl_expense_types')
            .update({
                is_active: isActive,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },
};
