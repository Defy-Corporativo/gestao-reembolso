import React, { useState, useEffect } from 'react';
import { useReembolso } from '../../contexts/ReembolsoContext';
import { requestService } from '../../services/requestService';
import { cycleService } from '../../services/cycleService';
import { storageService } from '../../services/storageService';
import { DollarSign, Lock, Download } from 'lucide-react';
import PagamentoForm from './PagamentoForm';
import styles from './GestaoFinanceira.module.css';

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
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[parseInt(m, 10) - 1]} ${y}`;
};

const GestaoFinanceira = () => {
    const { isExecutivoFinanceiro, openCycle, responsible, refreshCycle } = useReembolso();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [payingPerson, setPayingPerson] = useState(null); // { responsibleId, responsibleName }
    const [filterPerson, setFilterPerson] = useState('all');

    useEffect(() => {
        if (openCycle?.id) loadRequests();
        else setLoading(false);
    }, [openCycle?.id]);

    const loadRequests = async () => {
        try {
            setLoading(true);
            const data = await requestService.getRequestsByCycle(openCycle.id);
            setRequests(data);
        } catch (err) {
            console.error('Erro ao carregar solicitações:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseCycle = async () => {
        if (!confirm('Deseja fechar este ciclo de reembolso? Novas solicitações entrarão em um novo ciclo.')) return;
        try {
            await cycleService.closeCycle(openCycle.id, responsible.id);
            await refreshCycle();
            setRequests([]);
        } catch (err) {
            console.error('Erro ao fechar ciclo:', err);
            alert('Erro ao fechar ciclo.');
        }
    };

    if (!isExecutivoFinanceiro) {
        return (
            <div className={styles.pageWrapper}>
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}><Lock size={28} /></div>
                    <h3>Acesso restrito</h3>
                    <p>Apenas o Executivo Financeiro pode acessar esta tela.</p>
                </div>
            </div>
        );
    }

    // Agrupar por pessoa
    const grouped = {};
    const pendingRequests = requests.filter(r => r.status === 'pendente' || r.status === 'aprovado');
    pendingRequests.forEach(req => {
        const pid = req.responsible_id;
        if (!grouped[pid]) {
            grouped[pid] = {
                responsibleId: pid,
                responsibleName: req.pepl_responsibles?.name || 'Desconhecido',
                requests: [],
            };
        }
        grouped[pid].requests.push(req);
    });

    const persons = Object.values(grouped);
    const filteredPersons = filterPerson === 'all' ? persons : persons.filter(p => p.responsibleId === filterPerson);

    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAllForPerson = (personRequests) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            const allSelected = personRequests.every(r => next.has(r.id));
            if (allSelected) {
                personRequests.forEach(r => next.delete(r.id));
            } else {
                personRequests.forEach(r => next.add(r.id));
            }
            return next;
        });
    };

    const selectedTotal = pendingRequests
        .filter(r => selectedIds.has(r.id))
        .reduce((s, r) => s + parseFloat(r.amount || 0), 0);

    // Encontrar a pessoa dos itens selecionados (só pode pagar 1 pessoa por vez)
    const selectedPersonIds = new Set(
        pendingRequests.filter(r => selectedIds.has(r.id)).map(r => r.responsible_id)
    );

    const handleOpenPayment = () => {
        if (selectedPersonIds.size !== 1) {
            alert('Selecione solicitações de apenas uma pessoa para efetivar o pagamento.');
            return;
        }
        const pid = [...selectedPersonIds][0];
        const person = grouped[pid];
        setPayingPerson({
            responsibleId: pid,
            responsibleName: person.responsibleName,
            requestIds: [...selectedIds],
            totalAmount: selectedTotal,
        });
    };

    const handlePaymentDone = () => {
        setPayingPerson(null);
        setSelectedIds(new Set());
        loadRequests();
    };

    return (
        <div className={styles.pageWrapper}>
            <div className="page-header">
                <h1 className="page-title">Gestão Financeira</h1>
            </div>

            {!openCycle ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}><DollarSign size={28} /></div>
                    <h3>Nenhum ciclo aberto</h3>
                    <p>Não há ciclo de reembolso aberto no momento.</p>
                </div>
            ) : (
                <>
                    <div className={styles.closeCycleBar}>
                        <span className={styles.closeCycleText}>
                            Ciclo aberto: <strong>{formatMonth(openCycle.reference_month)}</strong>
                        </span>
                        <button className="btn btn-secondary" onClick={handleCloseCycle} style={{ fontSize: '13px' }}>
                            Fechar Ciclo
                        </button>
                    </div>

                    {persons.length > 1 && (
                        <div className={styles.filterBar}>
                            <select className="input" value={filterPerson} onChange={e => setFilterPerson(e.target.value)}>
                                <option value="all">Todas as pessoas</option>
                                {persons.map(p => (
                                    <option key={p.responsibleId} value={p.responsibleId}>{p.responsibleName}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {selectedIds.size > 0 && (
                        <div className={styles.actionBar}>
                            <span className={styles.selectedInfo}>
                                {selectedIds.size} selecionada(s) — Total: <span className={styles.selectedAmount}>{formatCurrency(selectedTotal)}</span>
                            </span>
                            <button className="btn btn-primary" onClick={handleOpenPayment}>
                                <DollarSign size={16} />
                                Efetivar Reembolso
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className={styles.emptyState}><p>Carregando...</p></div>
                    ) : filteredPersons.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}><DollarSign size={28} /></div>
                            <h3>Nenhuma solicitação pendente</h3>
                            <p>Não há solicitações de reembolso pendentes neste ciclo.</p>
                        </div>
                    ) : (
                        filteredPersons.map(person => {
                            const personTotal = person.requests.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
                            return (
                                <div key={person.responsibleId} className={styles.personGroup}>
                                    <div className={styles.personHeader}>
                                        <p className={styles.personName}>{person.responsibleName}</p>
                                        <span className={styles.personTotal}>{formatCurrency(personTotal)}</span>
                                    </div>
                                    <table className={styles.requestTable}>
                                        <thead>
                                            <tr>
                                                <th className={styles.checkboxCell}>
                                                    <input
                                                        type="checkbox"
                                                        checked={person.requests.every(r => selectedIds.has(r.id))}
                                                        onChange={() => selectAllForPerson(person.requests)}
                                                    />
                                                </th>
                                                <th>Data</th>
                                                <th>Descrição</th>
                                                <th style={{ textAlign: 'right' }}>Valor</th>
                                                <th style={{ textAlign: 'center', width: '90px' }}>Comprov.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {person.requests.map(req => (
                                                <tr key={req.id}>
                                                    <td className={styles.checkboxCell}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(req.id)}
                                                            onChange={() => toggleSelect(req.id)}
                                                        />
                                                    </td>
                                                    <td>{formatDate(req.expense_date)}</td>
                                                    <td>{req.description}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(req.amount)}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {req.receipt_path && (
                                                            <button
                                                                className={styles.downloadBtn}
                                                                title="Baixar comprovante"
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    try {
                                                                        await storageService.downloadReceipt(req.receipt_path);
                                                                    } catch (err) {
                                                                        console.error('Erro ao baixar:', err);
                                                                    }
                                                                }}
                                                            >
                                                                <Download size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })
                    )}
                </>
            )}

            {payingPerson && (
                <PagamentoForm
                    cycleId={openCycle.id}
                    responsibleId={payingPerson.responsibleId}
                    responsibleName={payingPerson.responsibleName}
                    requestIds={payingPerson.requestIds}
                    totalAmount={payingPerson.totalAmount}
                    onClose={() => setPayingPerson(null)}
                    onSubmit={handlePaymentDone}
                />
            )}
        </div>
    );
};

export default GestaoFinanceira;
