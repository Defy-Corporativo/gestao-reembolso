import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useReembolso } from '../../contexts/ReembolsoContext';
import { requestService } from '../../services/requestService';
import { storageService } from '../../services/storageService';
import { isPdfFile } from '../../services/storageService';
import { X, Camera, Image, FileText, Trash2 } from 'lucide-react';
import styles from './Reembolso.module.css';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ACCEPTED_PDF_TYPE = 'application/pdf';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

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

/**
 * ReembolsoForm — usado para criar e editar solicitações de reembolso.
 * 
 * Props:
 *   onClose()   — fechar o modal
 *   onSubmit()  — callback após salvar
 *   editingRequest — (opcional) objeto da solicitação a editar (modo edição)
 */
const ReembolsoForm = ({ onClose, onSubmit, editingRequest }) => {
    const { user } = useAuth();
    const { responsible } = useReembolso();
    const cameraInputRef = useRef(null);
    const fileInputRef = useRef(null);
    const pdfInputRef = useRef(null);

    const isEditing = !!editingRequest;

    const [formData, setFormData] = useState({
        expenseDate: '',
        amount: '',
        description: '',
    });
    // Comprovantes existentes no storage (modo edição): { storagePath, isPdf, previewUrl }
    const [existingReceipts, setExistingReceipts] = useState([]);
    // Novos arquivos selecionados pelo usuário: { file, isPdf, fileName, previewUrl }
    const [newFiles, setNewFiles] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [loadingExisting, setLoadingExisting] = useState(false);

    // Carregar dados da solicitação em modo edição
    useEffect(() => {
        if (!editingRequest) return;

        setFormData({
            expenseDate: editingRequest.expense_date || '',
            amount: String(editingRequest.amount || ''),
            description: editingRequest.description || '',
        });

        // Carregar previews dos comprovantes existentes
        const paths = parseReceiptPaths(editingRequest.receipt_paths);
        if (paths.length > 0) {
            setLoadingExisting(true);
            Promise.all(
                paths.map(async (p) => {
                    try {
                        const url = await storageService.getReceiptUrl(p);
                        return { storagePath: p, isPdf: isPdfFile(p), previewUrl: url };
                    } catch {
                        return { storagePath: p, isPdf: isPdfFile(p), previewUrl: null };
                    }
                })
            ).then(results => {
                setExistingReceipts(results);
                setLoadingExisting(false);
            });
        }
    }, [editingRequest]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addFiles = (fileList) => {
        if (!fileList || fileList.length === 0) return;

        const validFiles = [];
        for (const file of Array.from(fileList)) {
            const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type) || file.type.startsWith('image/');
            const isPdf = file.type === ACCEPTED_PDF_TYPE;
            if (!isImage && !isPdf) {
                setError(`Arquivo "${file.name}" não é um formato suportado. Use imagens ou PDF.`);
                continue;
            }
            if (file.size > MAX_FILE_SIZE) {
                setError(`Arquivo "${file.name}" excede o limite de 20MB.`);
                continue;
            }
            validFiles.push({
                file,
                isPdf,
                fileName: file.name,
                previewUrl: isPdf ? null : URL.createObjectURL(file),
            });
        }

        if (validFiles.length > 0) {
            setNewFiles(prev => [...prev, ...validFiles]);
        }
    };

    const removeExistingReceipt = async (index) => {
        const receipt = existingReceipts[index];
        // Remove do storage imediatamente
        try {
            await storageService.deleteReceipt(receipt.storagePath);
        } catch (err) {
            console.error('Erro ao remover comprovante do storage:', err);
        }
        setExistingReceipts(prev => {
            const updated = [...prev];
            updated.splice(index, 1);
            return updated;
        });
    };

    const removeNewFile = (index) => {
        setNewFiles(prev => {
            const updated = [...prev];
            if (updated[index].previewUrl) {
                URL.revokeObjectURL(updated[index].previewUrl);
            }
            updated.splice(index, 1);
            return updated;
        });
    };

    const handleCameraCapture = (e) => {
        addFiles(e.target.files);
        e.target.value = '';
    };

    const handleImageSelect = (e) => {
        addFiles(e.target.files);
        e.target.value = '';
    };

    const handlePdfSelect = (e) => {
        addFiles(e.target.files);
        e.target.value = '';
    };

    const totalAttachments = existingReceipts.length + newFiles.length;

    const handleSubmit = async () => {
        try {
            setError(null);

            if (!formData.expenseDate) {
                setError('Informe a data do gasto.');
                return;
            }
            if (!formData.amount || parseFloat(formData.amount) <= 0) {
                setError('Informe um valor válido.');
                return;
            }
            if (!formData.description.trim()) {
                setError('Informe a descrição do gasto.');
                return;
            }
            if (totalAttachments === 0) {
                setError('Envie pelo menos um comprovante (foto ou PDF).');
                return;
            }

            setSaving(true);

            const userName = user.email.split('@')[0];

            if (isEditing) {
                // Modo edição: atualizar solicitação existente
                await requestService.updateRequest({
                    requestId: editingRequest.id,
                    expenseDate: formData.expenseDate,
                    amount: formData.amount,
                    description: formData.description,
                    existingPaths: existingReceipts.map(r => r.storagePath),
                    newFiles: newFiles.map(nf => nf.file),
                    userName,
                });
            } else {
                // Modo criação: criar nova solicitação
                await requestService.createRequest({
                    responsibleId: responsible.id,
                    expenseDate: formData.expenseDate,
                    amount: formData.amount,
                    description: formData.description,
                    receiptFiles: newFiles.map(nf => nf.file),
                    userName,
                });
            }

            onSubmit();
        } catch (err) {
            console.error('Erro ao salvar solicitação:', err);
            setError('Erro ao salvar solicitação. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.formOverlay} onClick={onClose}>
            <div className={styles.formModal} onClick={e => e.stopPropagation()}>
                <div className={styles.formHeader}>
                    <h3>{isEditing ? 'Editar Solicitação' : 'Nova Solicitação'}</h3>
                    <button className={styles.formCloseBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.formBody}>
                    {error && (
                        <div style={{
                            padding: '12px',
                            background: '#FEE2E2',
                            color: '#991B1B',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            fontSize: '14px'
                        }}>
                            {error}
                        </div>
                    )}

                    <div className="input-group">
                        <label className="label">Data do Gasto *</label>
                        <input
                            type="date"
                            className="input"
                            value={formData.expenseDate}
                            onChange={e => handleChange('expenseDate', e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    <div className="input-group">
                        <label className="label">Valor (R$) *</label>
                        <input
                            type="number"
                            className="input"
                            placeholder="0,00"
                            step="0.01"
                            min="0.01"
                            value={formData.amount}
                            onChange={e => handleChange('amount', e.target.value)}
                            inputMode="decimal"
                        />
                    </div>

                    <div className="input-group">
                        <label className="label">Descrição *</label>
                        <textarea
                            className="input"
                            placeholder="Descreva brevemente o gasto..."
                            rows={3}
                            value={formData.description}
                            onChange={e => handleChange('description', e.target.value)}
                        />
                    </div>

                    <div className="input-group">
                        <label className="label">
                            Comprovantes * {totalAttachments > 0 && <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>({totalAttachments} arquivo{totalAttachments !== 1 ? 's' : ''})</span>}
                        </label>

                        {/* Inputs ocultos */}
                        <input
                            type="file"
                            ref={cameraInputRef}
                            accept="image/*"
                            capture="environment"
                            onChange={handleCameraCapture}
                            style={{ display: 'none' }}
                        />
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            multiple
                            onChange={handleImageSelect}
                            style={{ display: 'none' }}
                        />
                        <input
                            type="file"
                            ref={pdfInputRef}
                            accept=".pdf,application/pdf"
                            multiple
                            onChange={handlePdfSelect}
                            style={{ display: 'none' }}
                        />

                        {/* Botões de ação */}
                        <div className={styles.uploadActions}>
                            <button
                                type="button"
                                className={styles.uploadActionBtn}
                                onClick={() => cameraInputRef.current?.click()}
                            >
                                <Camera size={20} />
                                <span>Câmera</span>
                            </button>
                            <button
                                type="button"
                                className={styles.uploadActionBtn}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Image size={20} />
                                <span>Imagem</span>
                            </button>
                            <button
                                type="button"
                                className={styles.uploadActionBtn}
                                onClick={() => pdfInputRef.current?.click()}
                            >
                                <FileText size={20} />
                                <span>PDF</span>
                            </button>
                        </div>

                        {/* Grid de previews */}
                        {loadingExisting && (
                            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '10px' }}>
                                Carregando comprovantes existentes...
                            </p>
                        )}

                        {totalAttachments > 0 && (
                            <div className={styles.previewGrid}>
                                {/* Comprovantes existentes (já salvos no storage) */}
                                {existingReceipts.map((er, index) => (
                                    <div key={`existing-${index}`} className={styles.previewItem}>
                                        {er.isPdf ? (
                                            <div className={styles.previewPdf}>
                                                <FileText size={24} />
                                                <span className={styles.previewPdfName}>
                                                    {er.storagePath.length > 12
                                                        ? er.storagePath.substring(0, 10) + '…'
                                                        : er.storagePath}
                                                </span>
                                            </div>
                                        ) : (
                                            <img
                                                src={er.previewUrl}
                                                alt={`Comprovante ${index + 1}`}
                                                className={styles.previewImage}
                                            />
                                        )}
                                        <button
                                            type="button"
                                            className={styles.previewRemoveBtn}
                                            onClick={() => removeExistingReceipt(index)}
                                            title="Remover"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <span className={styles.previewIndex}>{index + 1}</span>
                                    </div>
                                ))}

                                {/* Novos comprovantes (ainda não salvos) */}
                                {newFiles.map((nf, index) => (
                                    <div key={`new-${index}`} className={styles.previewItem}>
                                        {nf.isPdf ? (
                                            <div className={styles.previewPdf}>
                                                <FileText size={24} />
                                                <span className={styles.previewPdfName}>
                                                    {nf.fileName.length > 12
                                                        ? nf.fileName.substring(0, 10) + '…'
                                                        : nf.fileName}
                                                </span>
                                            </div>
                                        ) : (
                                            <img
                                                src={nf.previewUrl}
                                                alt={`Novo comprovante ${index + 1}`}
                                                className={styles.previewImage}
                                            />
                                        )}
                                        <button
                                            type="button"
                                            className={styles.previewRemoveBtn}
                                            onClick={() => removeNewFile(index)}
                                            title="Remover"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <span className={styles.previewIndex}>{existingReceipts.length + index + 1}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.formFooter}>
                    <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
                        Cancelar
                    </button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                        {saving
                            ? 'Salvando...'
                            : isEditing
                                ? 'Salvar Alterações'
                                : 'Registrar Reembolso'
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReembolsoForm;
