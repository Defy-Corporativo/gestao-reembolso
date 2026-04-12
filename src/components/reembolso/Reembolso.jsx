import React, { useState, useEffect, useCallback } from 'react';
import { useReembolso } from '../../contexts/ReembolsoContext';
import { requestService } from '../../services/requestService';
import { storageService } from '../../services/storageService';
import { Receipt, Plus, ImageIcon, CalendarDays, Download, ChevronLeft, ChevronRight, X } from 'lucide-react';
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

// Parseia receipt_paths (JSON array ou string legado)
const parseReceiptPaths = (val) => {
    if (!val) return [];
    try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [val];
    } catch {
        return val ? [val] : [];
    }
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
    const [receiptUrls, setReceiptUrls] = useState({}); // { reqId: [url1, url2, ...] }
    const [downloading, setDownloading] = useState(false);

    // Viewer state: { paths: [...], urls: [...], currentIndex: 0 }
    const [viewer, setViewer] = useState(null);

    const loadRequests = useCallback(async () => {
        if (!responsible?.id || !openCycle?.id) return;
        try {
            setLoading(true);
            const data = await requestService.getRequestsByUserAndCycle(responsible.id, openCycle.id);
            setRequests(data);

            // Pre-load receipt thumbnails (primeiro comprovante de cada)
            const urls = {};
            for (const req of data) {
                const paths = parseReceiptPaths(req.receipt_paths);
                if (paths.length > 0) {
                    try {
                        const allUrls = await Promise.all(
                            paths.map(p => storageService.getReceiptUrl(p))
                        );
                        urls[req.id] = allUrls;
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

    const openViewer = (req) => {
        const paths = parseReceiptPaths(req.receipt_paths);
        const urls = receiptUrls[req.id] || [];
        if (urls.length === 0) return;
        setViewer({ paths, urls, currentIndex: 0 });
    };

    const navigateViewer = (dir, e) => {
        e.stopPropagation();
        setViewer(prev => {
            if (!prev) return null;
            const newIndex = prev.currentIndex + dir;
            if (newIndex < 0 || newIndex >= prev.urls.length) return prev;
            return { ...prev, currentIndex: newIndex };
        });
    };

    const downloadCurrent = async (e) => {
        e.stopPropagation();
        if (downloading || !viewer) return;
        try {
            setDownloading(true);
            await storageService.downloadReceipt(viewer.paths[viewer.currentIndex]);
        } catch (err) {
            console.error('Erro ao baixar comprovante:', err);
        } finally {
            setDownloading(false);
        }
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
                        {requests.map(req => {
                            const urls = receiptUrls[req.id] || [];
                            const paths = parseReceiptPaths(req.receipt_paths);
                            return (
                                <div key={req.id} className={styles.requestCard} onClick={() => openViewer(req)}>
                                    {urls.length > 0 ? (
                                        <div className={styles.receiptThumbWrapper}>
                                            <img src={urls[0]} alt="Comprovante" className={styles.receiptThumb} />
                                            {paths.length > 1 && (
                                                <span className={styles.receiptThumbCount}>{paths.length}</span>
                                            )}
                                        </div>
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
                            );
                        })}
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

            {/* Viewer fullscreen com navegação */}
            {viewer && (
                <div className={styles.receiptViewerOverlay} onClick={() => setViewer(null)}>
                    <button className={styles.viewerCloseBtn} onClick={(e) => { e.stopPropagation(); setViewer(null); }}>
                        <X size={24} />
                    </button>

                    {viewer.urls.length > 1 && viewer.currentIndex > 0 && (
                        <button className={`${styles.viewerNavBtn} ${styles.viewerNavLeft}`} onClick={(e) => navigateViewer(-1, e)}>
                            <ChevronLeft size={28} />
                        </button>
                    )}

                    <img src={viewer.urls[viewer.currentIndex]} alt="Comprovante" className={styles.receiptViewerImg} />

                    {viewer.urls.length > 1 && viewer.currentIndex < viewer.urls.length - 1 && (
                        <button className={`${styles.viewerNavBtn} ${styles.viewerNavRight}`} onClick={(e) => navigateViewer(1, e)}>
                            <ChevronRight size={28} />
                        </button>
                    )}

                    <div className={styles.viewerBottomBar} onClick={e => e.stopPropagation()}>
                        {viewer.urls.length > 1 && (
                            <span className={styles.viewerCounter}>
                                {viewer.currentIndex + 1} / {viewer.urls.length}
                            </span>
                        )}
                        <button className={styles.receiptDownloadBtn} onClick={downloadCurrent}>
                            <Download size={18} />
                            {downloading ? 'Baixando...' : 'Baixar'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reembolso;
