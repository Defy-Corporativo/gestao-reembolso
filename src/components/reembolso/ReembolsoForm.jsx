import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useReembolso } from '../../contexts/ReembolsoContext';
import { requestService } from '../../services/requestService';
import { X, Camera, Upload } from 'lucide-react';
import styles from './Reembolso.module.css';

const ReembolsoForm = ({ onClose, onSubmit }) => {
    const { user } = useAuth();
    const { responsible } = useReembolso();
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        expenseDate: '',
        amount: '',
        description: '',
    });
    const [receiptFile, setReceiptFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setReceiptFile(file);

        // Gerar preview
        const reader = new FileReader();
        reader.onload = () => setPreviewUrl(reader.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        try {
            setError(null);

            // Validações
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
            if (!receiptFile) {
                setError('Envie a foto do comprovante.');
                return;
            }

            setSaving(true);

            // Extrair nome do usuário Azure (parte antes do @)
            const userName = user.email.split('@')[0];

            await requestService.createRequest({
                responsibleId: responsible.id,
                expenseDate: formData.expenseDate,
                amount: formData.amount,
                description: formData.description,
                receiptFile,
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
                        <label className="label">Comprovante *</label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                        <div
                            className={`${styles.fileUploadArea} ${receiptFile ? styles.hasFile : ''}`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {previewUrl ? (
                                <>
                                    <img src={previewUrl} alt="Preview" className={styles.imagePreview} />
                                    <p className={styles.fileUploadText} style={{ marginTop: '8px' }}>
                                        {receiptFile.name}
                                    </p>
                                    <p className={styles.fileUploadHint}>Toque para trocar</p>
                                </>
                            ) : (
                                <>
                                    <div className={styles.fileUploadIcon}>
                                        <Camera size={32} />
                                    </div>
                                    <p className={styles.fileUploadText}>
                                        Tire uma foto ou selecione um arquivo
                                    </p>
                                    <p className={styles.fileUploadHint}>
                                        <Upload size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                        JPG, PNG ou PDF
                                    </p>
                                </>
                            )}
                        </div>
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
