import React, { useState, useEffect } from 'react';
import { useReembolso } from '../../contexts/ReembolsoContext';
import { requestService } from '../../services/requestService';
import { cycleService } from '../../services/cycleService';
import { storageService } from '../../services/storageService';
import { DollarSign, Lock, Download, Calendar } from 'lucide-react';
import PagamentoForm from './PagamentoForm';
import styles from './GestaoFinanceira.module.css';

const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

const formatDateShort = (dateStr) => {
    if (!dateStr) return '';
    // Suporta ISO timestamps e dates simples
    const d = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
};

const GestaoFinanceira = () => {
    const { isExecutivoFinanceiro, openCycle, responsible, refreshCycle } = useReembolso();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [payingPerson, setPayingPerson] = useState(null); // { responsibleId, responsibleName }
    const [filterPerson, setFilterPerson] = useState('all');

    // Estado do modal de fechar ciclo
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [closingDate, setClosingDate] = useState('');
    const [closingLoading, setClosingLoading] = useState(false);

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

    const handleOpenCloseModal = () => {
        // Pré-preenche com a data de hoje
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        setClosingDate(todayStr);
        setShowCloseModal(true);
    };

    const handleCloseCycle = async () => {
        if (!closingDate) {
            alert('Informe a data de fechamento do ciclo.');
            return;
        }

        // Validar que a data não é futura
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selected = new Date(closingDate + 'T00:00:00');
        if (selected > today) {
            alert('A data de fechamento não pode ser maior que a data atual.');
            return;
        }

        try {
            setClosingLoading(true);
            await cycleService.closeCycle(openCycle.id, responsible.id, closingDate);
            setShowCloseModal(false);
            await refreshCycle();
            setRequests([]);
        } catch (err) {
            console.error('Erro ao fechar ciclo:', err);
            alert('Erro ao fechar ciclo.');
        } finally {
            setClosingLoading(false);
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

    // Data máxima para o input de fechamento (hoje)
    const todayStr = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

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
                            Ciclo aberto desde: <strong>{formatDateShort(openCycle.opened_date || openCycle.opened_at)}</strong>
                        </span>
                        <button className="btn btn-secondary" onClick={handleOpenCloseModal} style={{ fontSize: '13px' }}>
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
                                                        {(() => {
                                                            let paths = [];
                                                            try { paths = JSON.parse(req.receipt_paths || '[]'); } catch { paths = req.receipt_paths ? [req.receipt_paths] : []; }
                                                            return paths.length > 0 && (
                                                                <button
                                                                    className={styles.downloadBtn}
                                                                    title={`Baixar ${paths.length} comprovante(s)`}
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        try {
                                                                            for (const p of paths) {
                                                                                await storageService.downloadReceipt(p);
                                                                            }
                                                                        } catch (err) {
                                                                            console.error('Erro ao baixar:', err);
                                                                        }
                                                                    }}
                                                                >
                                                                    <Download size={16} />
                                                                    {paths.length > 1 && <span style={{ fontSize: '11px' }}>{paths.length}</span>}
                                                                </button>
                                                            );
                                                        })()}
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

            {/* Modal de fechamento do ciclo */}
            {showCloseModal && (
                <div className={styles.formOverlay} onClick={() => !closingLoading && setShowCloseModal(false)}>
                    <div className={styles.formModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.formHeader}>
                            <h3>Fechar Ciclo</h3>
                            <button className={styles.formCloseBtn} onClick={() => !closingLoading && setShowCloseModal(false)}>✕</button>
                        </div>
                        <div className={styles.formBody}>
                            <div className={styles.closeModalInfo}>
                                <Calendar size={18} />
                                <span>Ciclo aberto em <strong>{formatDateShort(openCycle.opened_date || openCycle.opened_at)}</strong></span>
                            </div>
                            <p className={styles.closeModalDesc}>
                                Informe a data de fechamento deste ciclo. Novas solicitações entrarão em um novo ciclo.
                            </p>
                            <label className={styles.inputLabel}>
                                Data de fechamento
                                <input
                                    type="date"
                                    className="input"
                                    value={closingDate}
                                    onChange={e => setClosingDate(e.target.value)}
                                    max={todayStr}
                                    required
                                />
                            </label>
                        </div>
                        <div className={styles.formFooter}>
                            <button className="btn btn-secondary" onClick={() => setShowCloseModal(false)} disabled={closingLoading}>
                                Cancelar
                            </button>
                            <button className="btn btn-primary" onClick={handleCloseCycle} disabled={closingLoading}>
                                {closingLoading ? 'Fechando...' : 'Confirmar Fechamento'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestaoFinanceira;
