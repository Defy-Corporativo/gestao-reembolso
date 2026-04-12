import { supabase } from './supabaseClient';

// ATENÇÃO: Este service é SOMENTE LEITURA para as tabelas pepl_roles e pepl_responsible_roles.
// O CRUD completo de papéis é gerenciado pela aplicação "gestao-pessoal".

export const roleService = {
    // Verifica se um responsável possui um papel específico
    async hasRole(responsibleId, roleName) {
        const { data, error } = await supabase
            .from('pepl_responsible_roles')
            .select(`
                id,
                pepl_roles!inner(name)
            `)
            .eq('responsible_id', responsibleId)
            .eq('pepl_roles.name', roleName)
            .maybeSingle();

        if (error) throw error;
        return !!data;
    },

    // Busca todos os papéis de um responsável
    async getRolesForResponsible(responsibleId) {
        const { data, error } = await supabase
            .from('pepl_responsible_roles')
            .select(`
                id,
                pepl_roles(id, name)
            `)
            .eq('responsible_id', responsibleId);

        if (error) throw error;
        return (data || []).map(r => r.pepl_roles);
    },
};
