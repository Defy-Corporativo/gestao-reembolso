import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useReembolso } from '../../contexts/ReembolsoContext';
import { requestService } from '../../services/requestService';
import { X, Camera, Image, FileText, Trash2 } from 'lucide-react';
import styles from './Reembolso.module.css';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ACCEPTED_PDF_TYPE = 'application/pdf';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const ReembolsoForm = ({ onClose, onSubmit }) => {
    const { user } = useAuth();
    const { responsible } = useReembolso();
    const cameraInputRef = useRef(null);
    const fileInputRef = useRef(null);
    const pdfInputRef = useRef(null);

    const [formData, setFormData] = useState({
        expenseDate: '',
        amount: '',
        description: '',
    });
    const [receiptFiles, setReceiptFiles] = useState([]); // Array de { file, previewUrl }
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addFiles = (fileList) => {
        if (!fileList || fileList.length === 0) return;

        const validFiles = [];
        for (const file of Array.from(fileList)) {
            // Validação de tipo
            const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type) || file.type.startsWith('image/');
            const isPdf = file.type === ACCEPTED_PDF_TYPE;
            if (!isImage && !isPdf) {
                setError(`Arquivo "${file.name}" não é um formato suportado. Use imagens ou PDF.`);
                continue;
            }
            // Validação de tamanho
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
            setReceiptFiles(prev => [...prev, ...validFiles]);
        }
    };

    const removeFile = (index) => {
        setReceiptFiles(prev => {
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
        // Reset input para permitir tirar outra foto em sequência
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
            if (receiptFiles.length === 0) {
                setError('Envie pelo menos um comprovante (foto ou PDF).');
                return;
            }

            setSaving(true);

            const userName = user.email.split('@')[0];

            await requestService.createRequest({
                responsibleId: responsible.id,
                expenseDate: formData.expenseDate,
                amount: formData.amount,
                description: formData.description,
                receiptFiles: receiptFiles.map(rf => rf.file),
                userName,
            });

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
                    <h3>Nova Solicitação</h3>
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
                            Comprovantes * {receiptFiles.length > 0 && <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>({receiptFiles.length} arquivo{receiptFiles.length !== 1 ? 's' : ''})</span>}
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
                        {receiptFiles.length > 0 && (
                            <div className={styles.previewGrid}>
                                {receiptFiles.map((rf, index) => (
                                    <div key={index} className={styles.previewItem}>
                                        {rf.isPdf ? (
                                            <div className={styles.previewPdf}>
                                                <FileText size={24} />
                                                <span className={styles.previewPdfName}>
                                                    {rf.fileName.length > 12
                                                        ? rf.fileName.substring(0, 10) + '…'
                                                        : rf.fileName}
                                                </span>
                                            </div>
                                        ) : (
                                            <img
                                                src={rf.previewUrl}
                                                alt={`Comprovante ${index + 1}`}
                                                className={styles.previewImage}
                                            />
                                        )}
                                        <button
                                            type="button"
                                            className={styles.previewRemoveBtn}
                                            onClick={() => removeFile(index)}
                                            title="Remover"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <span className={styles.previewIndex}>{index + 1}</span>
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
                        {saving ? 'Salvando...' : 'Registrar Reembolso'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReembolsoForm;
