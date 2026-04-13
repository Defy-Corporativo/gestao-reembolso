import React, { useState, useEffect } from 'react';
import { useReembolso } from '../../contexts/ReembolsoContext';
import { expenseTypeService } from '../../services/expenseTypeService';
import { Lock, Plus, Pencil, Check, X, ToggleLeft, ToggleRight, Tag } from 'lucide-react';
import styles from './TiposDespesa.module.css';

const TiposDespesa = () => {
    const { isExecutivoFinanceiro, loadingContext } = useReembolso();
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isExecutivoFinanceiro) loadTypes();
    }, [isExecutivoFinanceiro]);

    const loadTypes = async () => {
        try {
            setLoading(true);
            const data = await expenseTypeService.getAllExpenseTypes();
            setTypes(data);
        } catch (err) {
            console.error('Erro ao carregar tipos de despesa:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newName.trim()) return;
        try {
            setError(null);
            setAdding(true);
            await expenseTypeService.createExpenseType(newName);
            setNewName('');
            await loadTypes();
        } catch (err) {
            if (err.code === '23505') {
                setError('Já existe um tipo de despesa com esse nome.');
            } else {
                setError('Erro ao criar tipo de despesa.');
            }
            console.error('Erro ao criar tipo de despesa:', err);
        } finally {
            setAdding(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleAdd();
    };

    const startEdit = (type) => {
        setEditingId(type.id);
        setEditingName(type.name);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditingName('');
    };

    const saveEdit = async () => {
        if (!editingName.trim()) return;
        try {
            setError(null);
            await expenseTypeService.updateExpenseType(editingId, editingName);
            setEditingId(null);
            setEditingName('');
            await loadTypes();
        } catch (err) {
            if (err.code === '23505') {
                setError('Já existe um tipo de despesa com esse nome.');
            } else {
                setError('Erro ao atualizar tipo de despesa.');
            }
            console.error('Erro ao atualizar tipo de despesa:', err);
        }
    };

    const handleEditKeyDown = (e) => {
        if (e.key === 'Enter') saveEdit();
        if (e.key === 'Escape') cancelEdit();
    };

    const handleToggle = async (type) => {
        try {
            await expenseTypeService.toggleExpenseType(type.id, !type.is_active);
            await loadTypes();
        } catch (err) {
            console.error('Erro ao alterar status:', err);
        }
    };

    if (loadingContext) {
        return <div className={styles.pageWrapper}><div className={styles.emptyState}><p>Carregando...</p></div></div>;
    }

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

    return (
        <div className={styles.pageWrapper}>
            <div className="page-header">
                <h1 className="page-title">Tipos de Despesa</h1>
            </div>

            {/* Formulário de adição */}
            <div className={styles.addBar}>
                <input
                    type="text"
                    className="input"
                    placeholder="Nome do tipo de despesa..."
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={adding}
                />
                <button
                    className="btn btn-primary"
                    onClick={handleAdd}
                    disabled={adding || !newName.trim()}
                >
                    <Plus size={18} />
                    {adding ? 'Adicionando...' : 'Adicionar'}
                </button>
            </div>

            {error && (
                <div className={styles.errorMsg}>{error}</div>
            )}

            {/* Lista de tipos */}
            {loading ? (
                <div className={styles.emptyState}><p>Carregando tipos...</p></div>
            ) : types.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}><Tag size={28} /></div>
                    <h3>Nenhum tipo de despesa</h3>
                    <p>Cadastre os tipos de despesa que os colaboradores poderão selecionar.</p>
                </div>
            ) : (
                <div className={styles.typeList}>
                    {types.map(type => (
                        <div
                            key={type.id}
                            className={`${styles.typeCard} ${!type.is_active ? styles.typeInactive : ''}`}
                        >
                            {editingId === type.id ? (
                                <div className={styles.editRow}>
                                    <input
                                        type="text"
                                        className="input"
                                        value={editingName}
                                        onChange={e => setEditingName(e.target.value)}
                                        onKeyDown={handleEditKeyDown}
                                        autoFocus
                                    />
                                    <button className={styles.iconBtn} onClick={saveEdit} title="Salvar">
                                        <Check size={18} />
                                    </button>
                                    <button className={styles.iconBtn} onClick={cancelEdit} title="Cancelar">
                                        <X size={18} />
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.typeRow}>
                                    <span className={styles.typeName}>{type.name}</span>
                                    <div className={styles.typeActions}>
                                        {!type.is_active && (
                                            <span className={styles.inactiveBadge}>Inativo</span>
                                        )}
                                        <button
                                            className={styles.iconBtn}
                                            onClick={() => startEdit(type)}
                                            title="Editar"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            className={`${styles.toggleBtn} ${type.is_active ? styles.toggleActive : styles.toggleInactive}`}
                                            onClick={() => handleToggle(type)}
                                            title={type.is_active ? 'Desativar' : 'Ativar'}
                                        >
                                            {type.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TiposDespesa;
