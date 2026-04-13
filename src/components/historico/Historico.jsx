import React, { useState, useEffect } from 'react';
import { useReembolso } from '../../contexts/ReembolsoContext';
import { cycleService } from '../../services/cycleService';
import { requestService } from '../../services/requestService';
import { History, ChevronDown, FolderClock } from 'lucide-react';
import styles from './Historico.module.css';

const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

const formatDateShort = (dateStr) => {
    if (!dateStr) return '';
    const d = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
};

const Historico = () => {
    const { responsible } = useReembolso();
    const [cycles, setCycles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCycle, setExpandedCycle] = useState(null);
    const [cycleRequests, setCycleRequests] = useState({});

    useEffect(() => {
        loadCycles();
    }, []);

    const loadCycles = async () => {
        try {
            setLoading(true);
            const data = await cycleService.getClosedCycles();
            setCycles(data);
        } catch (err) {
            console.error('Erro ao carregar ciclos:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleCycle = async (cycleId) => {
        if (expandedCycle === cycleId) {
            setExpandedCycle(null);
            return;
        }

        setExpandedCycle(cycleId);

        // Carregar solicitações do ciclo (do usuário logado)
        if (!cycleRequests[cycleId] && responsible?.id) {
            try {
                const data = await requestService.getRequestsByUserAndCycle(responsible.id, cycleId);
                setCycleRequests(prev => ({ ...prev, [cycleId]: data }));
            } catch (err) {
                console.error('Erro ao carregar solicitações:', err);
            }
        }
    };

    if (loading) {
        return <div className={styles.pageWrapper}><div className={styles.emptyState}><p>Carregando...</p></div></div>;
    }

    return (
        <div className={styles.pageWrapper}>
            <div className="page-header">
                <h1 className="page-title">Histórico</h1>
            </div>

            {cycles.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <FolderClock size={28} />
                    </div>
                    <h3>Sem histórico</h3>
                    <p>Nenhum ciclo de reembolso fechado até o momento.</p>
                </div>
            ) : (
                <div className={styles.cycleList}>
                    {cycles.map(cycle => {
                        const isOpen = expandedCycle === cycle.id;
                        const reqs = cycleRequests[cycle.id] || [];
                        const total = reqs.reduce((s, r) => s + parseFloat(r.amount || 0), 0);

                        return (
                            <div key={cycle.id} className={styles.cycleCard}>
                                <div className={styles.cycleCardHeader} onClick={() => toggleCycle(cycle.id)}>
                                    <div className={styles.cycleCardLeft}>
                                        <div className={styles.cycleIcon}>
                                            <History size={20} />
                                        </div>
                                        <div>
                                            <p className={styles.cycleMonth}>
                                                {formatDateShort(cycle.opened_date || cycle.opened_at)}
                                                {' — '}
                                                {formatDateShort(cycle.closed_date || cycle.closed_at)}
                                            </p>
                                            <p className={styles.cycleSubtext}>Ciclo fechado</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {isOpen && reqs.length > 0 && (
                                            <div className={styles.cycleAmount}>
                                                {formatCurrency(total)}
                                                <span className={styles.cycleAmountLabel}>Total solicitado</span>
                                            </div>
                                        )}
                                        <ChevronDown size={18} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
                                    </div>
                                </div>
                                {isOpen && (
                                    <div className={styles.cycleCardBody}>
                                        {reqs.length === 0 ? (
                                            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px 0' }}>
                                                Nenhuma solicitação registrada neste ciclo.
                                            </p>
                                        ) : (
                                            reqs.map(req => (
                                                <div key={req.id} className={styles.requestItem}>
                                                    <div className={styles.requestItemLeft}>
                                                        <p className={styles.requestItemDesc}>{req.description}</p>
                                                        <p className={styles.requestItemDate}>{formatDate(req.expense_date)} — {req.status}</p>
                                                    </div>
                                                    <span className={styles.requestItemAmount}>{formatCurrency(req.amount)}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Historico;
