import React, { useState, useEffect, useCallback } from 'react';
import { useReembolso } from '../../contexts/ReembolsoContext';
import { requestService } from '../../services/requestService';
import { storageService } from '../../services/storageService';
import { Receipt, Plus, ImageIcon, CalendarDays, Download } from 'lucide-react';
import ReembolsoForm from './ReembolsoForm';
import styles from './Reembolso.module.css';

const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

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

const statusMap = {
    pendente: { label: 'Pendente', css: styles.statusPendente },
    aprovado: { label: 'Aprovado', css: styles.statusAprovado },
    reembolsado: { label: 'Reembolsado', css: styles.statusReembolsado },
    rejeitado: { label: 'Rejeitado', css: styles.statusRejeitado },
};

const Reembolso = () => {
    const { responsible, openCycle, loadingContext, refreshCycle } = useReembolso();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [viewingReceipt, setViewingReceipt] = useState(null); // { url, path }
    const [receiptUrls, setReceiptUrls] = useState({});
    const [downloading, setDownloading] = useState(false);

    const loadRequests = useCallback(async () => {
        if (!responsible?.id || !openCycle?.id) return;
        try {
            setLoading(true);
            const data = await requestService.getRequestsByUserAndCycle(responsible.id, openCycle.id);
            setRequests(data);

            // Pre-load receipt thumbnails
            const urls = {};
            for (const req of data) {
                if (req.receipt_path) {
                    try {
                        urls[req.id] = await storageService.getReceiptUrl(req.receipt_path);
                    } catch {
                        // ignore
                    }
                }
            }
            setReceiptUrls(urls);
        } catch (err) {
            console.error('Erro ao carregar solicitações:', err);
        } finally {
            setLoading(false);
        }
    }, [responsible?.id, openCycle?.id]);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    const handleFormSubmit = async () => {
        setShowForm(false);
        await refreshCycle();
        await loadRequests();
    };

    const total = requests.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

    if (loadingContext) {
        return (
            <div className={styles.pageWrapper}>
                <div className={styles.emptyState}>
                    <p>Carregando...</p>
                </div>
            </div>
        );
    }

    if (!responsible) {
        return (
            <div className={styles.pageWrapper}>
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <Receipt size={28} />
                    </div>
                    <h3>Cadastro não encontrado</h3>
                    <p>Seu e-mail não está vinculado a nenhum responsável cadastrado no sistema. Entre em contato com a administração.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.pageWrapper}>
            <div className="page-header">
                <h1 className="page-title">Reembolso</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <Plus size={18} />
                    Nova Solicitação
                </button>
            </div>

            {openCycle && (
                <div className={styles.cycleInfo}>
                    <div className={styles.cycleIcon}>
                        <CalendarDays size={20} />
                    </div>
                    <div className={styles.cycleText}>
                        <h3>Ciclo Aberto — {formatMonth(openCycle.reference_month)}</h3>
                        <p>{requests.length} solicitação(ões) registrada(s)</p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className={styles.emptyState}><p>Carregando solicitações...</p></div>
            ) : requests.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <Receipt size={28} />
                    </div>
                    <h3>Nenhuma solicitação</h3>
                    <p>{openCycle ? 'Registre sua primeira solicitação de reembolso neste ciclo.' : 'O ciclo será criado automaticamente ao registrar a primeira solicitação.'}</p>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={18} />
                        Nova Solicitação
                    </button>
                </div>
            ) : (
                <>
                    <div className={styles.requestList}>
                        {requests.map(req => (
                            <div key={req.id} className={styles.requestCard} onClick={() => receiptUrls[req.id] && setViewingReceipt({ url: receiptUrls[req.id], path: req.receipt_path })}>
                                {receiptUrls[req.id] ? (
                                    <img src={receiptUrls[req.id]} alt="Comprovante" className={styles.receiptThumb} />
                                ) : (
                                    <div className={styles.receiptThumbPlaceholder}>
                                        <ImageIcon size={20} />
                                    </div>
                                )}
                                <div className={styles.requestInfo}>
                                    <div className={styles.requestHeader}>
                                        <p className={styles.requestDescription}>{req.description}</p>
                                        <span className={styles.requestAmount}>{formatCurrency(req.amount)}</span>
                                    </div>
                                    <p className={styles.requestDate}>{formatDate(req.expense_date)}</p>
                                    <span className={`${styles.statusBadge} ${statusMap[req.status]?.css || ''}`}>
                                        {statusMap[req.status]?.label || req.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.totalBar}>
                        <span className={styles.totalLabel}>Total solicitado</span>
                        <span className={styles.totalValue}>{formatCurrency(total)}</span>
                    </div>
                </>
            )}

            {showForm && (
                <ReembolsoForm
                    onClose={() => setShowForm(false)}
                    onSubmit={handleFormSubmit}
                />
            )}

            {viewingReceipt && (
                <div className={styles.receiptViewerOverlay} onClick={() => setViewingReceipt(null)}>
                    <img src={viewingReceipt.url} alt="Comprovante" className={styles.receiptViewerImg} />
                    <button
                        className={styles.receiptDownloadBtn}
                        onClick={async (e) => {
                            e.stopPropagation();
                            if (downloading) return;
                            try {
                                setDownloading(true);
                                await storageService.downloadReceipt(viewingReceipt.path);
                            } catch (err) {
                                console.error('Erro ao baixar comprovante:', err);
                            } finally {
                                setDownloading(false);
                            }
                        }}
                        title="Baixar comprovante"
                    >
                        <Download size={20} />
                        {downloading ? 'Baixando...' : 'Baixar'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default Reembolso;
