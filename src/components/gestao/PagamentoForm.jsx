import React, { useState } from 'react';
import { useReembolso } from '../../contexts/ReembolsoContext';
import { paymentService } from '../../services/paymentService';
import { X } from 'lucide-react';
import styles from './GestaoFinanceira.module.css';

const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const PagamentoForm = ({ cycleId, responsibleId, responsibleName, requestIds, totalAmount, onClose, onSubmit }) => {
    const { responsible } = useReembolso();

    const [formData, setFormData] = useState({
        paymentDate: new Date().toISOString().split('T')[0],
        totalAmount: totalAmount.toFixed(2),
        transactionCode: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        try {
            setError(null);

            if (!formData.paymentDate) {
                setError('Informe a data do reembolso.');
                return;
            }
            if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
                setError('Informe o valor total pago.');
                return;
            }
            if (!formData.transactionCode.trim()) {
                setError('Informe o código da transação (ex: código Pix).');
                return;
            }

            setSaving(true);

            await paymentService.createPayment({
                cycleId,
                responsibleId,
                paymentDate: formData.paymentDate,
                totalAmount: formData.totalAmount,
                transactionCode: formData.transactionCode,
                createdBy: responsible.id,
                requestIds,
            });

            onSubmit();
        } catch (err) {
            console.error('Erro ao efetivar pagamento:', err);
            setError('Erro ao efetivar pagamento. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.formOverlay} onClick={onClose}>
            <div className={styles.formModal} onClick={e => e.stopPropagation()}>
                <div className={styles.formHeader}>
                    <h3>Efetivar Reembolso</h3>
                    <button className={styles.formCloseBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.formBody}>
                    <div className={styles.summaryBox}>
                        <div className={styles.summaryRow}>
                            <span>Beneficiário</span>
                            <span style={{ fontWeight: 600 }}>{responsibleName}</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span>Itens selecionados</span>
                            <span>{requestIds.length}</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span>Total das solicitações</span>
                            <span>{formatCurrency(totalAmount)}</span>
                        </div>
                    </div>

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
                        <label className="label">Data do Reembolso *</label>
                        <input
                            type="date"
                            className="input"
                            value={formData.paymentDate}
                            onChange={e => handleChange('paymentDate', e.target.value)}
                        />
                    </div>

                    <div className="input-group">
                        <label className="label">Valor Total Pago (R$) *</label>
                        <input
                            type="number"
                            className="input"
                            step="0.01"
                            min="0.01"
                            value={formData.totalAmount}
                            onChange={e => handleChange('totalAmount', e.target.value)}
                            inputMode="decimal"
                        />
                    </div>

                    <div className="input-group">
                        <label className="label">Código da Transação *</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Ex: código Pix, ID da transferência..."
                            value={formData.transactionCode}
                            onChange={e => handleChange('transactionCode', e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.formFooter}>
                    <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
                        Cancelar
                    </button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                        {saving ? 'Processando...' : 'Confirmar Pagamento'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PagamentoForm;
