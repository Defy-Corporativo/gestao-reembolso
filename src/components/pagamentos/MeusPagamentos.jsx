import React, { useState, useEffect } from 'react';
import { useReembolso } from '../../contexts/ReembolsoContext';
import { paymentService } from '../../services/paymentService';
import { Wallet } from 'lucide-react';
import styles from './MeusPagamentos.module.css';

const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

const formatMonth = (ref) => {
    if (!ref) return '';
    const [y, m] = ref.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(m, 10) - 1]} ${y}`;
};

const MeusPagamentos = () => {
    const { responsible, loadingContext } = useReembolso();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (responsible?.id) loadPayments();
    }, [responsible?.id]);

    const loadPayments = async () => {
        try {
            setLoading(true);
            const data = await paymentService.getPaymentsByResponsible(responsible.id);
            setPayments(data);
        } catch (err) {
            console.error('Erro ao carregar pagamentos:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loadingContext || loading) {
        return <div className={styles.pageWrapper}><div className={styles.emptyState}><p>Carregando...</p></div></div>;
    }

    return (
        <div className={styles.pageWrapper}>
            <div className="page-header">
                <h1 className="page-title">Meus Pagamentos</h1>
            </div>

            {payments.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}><Wallet size={28} /></div>
                    <h3>Nenhum pagamento</h3>
                    <p>Você ainda não recebeu nenhum reembolso.</p>
                </div>
            ) : (
                <div className={styles.paymentList}>
                    {payments.map(payment => (
                        <div key={payment.id} className={styles.paymentCard}>
                            <div className={styles.paymentHeader}>
                                <div>
                                    <p className={styles.paymentDate}>
                                        {formatDate(payment.payment_date)}
                                    </p>
                                    <p className={styles.paymentCycle}>
                                        Ciclo: {formatMonth(payment.rebl_cycles?.reference_month)}
                                    </p>
                                </div>
                                <span className={styles.paymentAmount}>
                                    {formatCurrency(payment.total_amount)}
                                </span>
                            </div>
                            <div className={styles.paymentMeta}>
                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>Transação: </span>
                                    {payment.transaction_code}
                                </div>
                                {payment.creator?.name && (
                                    <div className={styles.metaItem}>
                                        <span className={styles.metaLabel}>Efetivado por: </span>
                                        {payment.creator.name}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MeusPagamentos;
