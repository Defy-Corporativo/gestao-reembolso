import { supabase } from './supabaseClient';

export const paymentService = {
    // Cria pagamento e vincula solicitações selecionadas
    async createPayment({ cycleId, responsibleId, paymentDate, totalAmount, transactionCode, paymentReceiptText, createdBy, requestIds }) {
        // 1. Criar o pagamento
        const { data: payment, error: paymentError } = await supabase
            .from('rebl_payments')
            .insert({
                cycle_id: cycleId,
                responsible_id: responsibleId,
                payment_date: paymentDate,
                total_amount: parseFloat(totalAmount),
                transaction_code: transactionCode.trim(),
                payment_receipt_text: paymentReceiptText?.trim() || null,
                created_by: createdBy,
            })
            .select()
            .single();

        if (paymentError) throw paymentError;

        // 2. Criar os itens de pagamento
        const items = requestIds.map(requestId => ({
            payment_id: payment.id,
            request_id: requestId,
        }));

        const { error: itemsError } = await supabase
            .from('rebl_payment_items')
            .insert(items);

        if (itemsError) throw itemsError;

        // 3. Atualizar status das solicitações para 'reembolsado'
        const { error: statusError } = await supabase
            .from('rebl_requests')
            .update({
                status: 'reembolsado',
                updated_at: new Date().toISOString(),
            })
            .in('id', requestIds);

        if (statusError) throw statusError;

        return payment;
    },

    // Busca pagamentos recebidos por um responsável
    async getPaymentsByResponsible(responsibleId) {
        const { data, error } = await supabase
            .from('rebl_payments')
            .select(`
                *,
                rebl_cycles(reference_month, opened_date, closed_date),
                creator:pepl_responsibles!rebl_payments_created_by_fkey(name)
            `)
            .eq('responsible_id', responsibleId)
            .order('payment_date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Busca detalhes de um pagamento com itens
    async getPaymentDetails(paymentId) {
        const { data: payment, error: paymentError } = await supabase
            .from('rebl_payments')
            .select(`
                *,
                rebl_cycles(reference_month, opened_date, closed_date),
                creator:pepl_responsibles!rebl_payments_created_by_fkey(name)
            `)
            .eq('id', paymentId)
            .single();

        if (paymentError) throw paymentError;

        // Buscar itens do pagamento com dados da solicitação
        const { data: items, error: itemsError } = await supabase
            .from('rebl_payment_items')
            .select(`
                id,
                rebl_requests(id, expense_date, amount, description, receipt_paths)
            `)
            .eq('payment_id', paymentId);

        if (itemsError) throw itemsError;

        return {
            ...payment,
            items: (items || []).map(i => i.rebl_requests),
        };
    },

    // Busca todos os pagamentos de um ciclo
    async getPaymentsByCycle(cycleId) {
        const { data, error } = await supabase
            .from('rebl_payments')
            .select(`
                *,
                pepl_responsibles!rebl_payments_responsible_id_fkey(name)
            `)
            .eq('cycle_id', cycleId)
            .order('payment_date', { ascending: false });

        if (error) throw error;
        return data || [];
    },
};
