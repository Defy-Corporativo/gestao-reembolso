import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Receipt, History, Wallet, Menu, ChevronLeft, CreditCard } from 'lucide-react';
import { useReembolso } from '../../contexts/ReembolsoContext';
import styles from './Layout.module.css';

const Sidebar = ({ isCollapsed, onToggle }) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const { isExecutivoFinanceiro } = useReembolso();

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <>
            {!isCollapsed && <div className={styles.sidebarOverlay} onClick={onToggle} />}
            <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
                <div className={styles.sidebarHeader}>
                    {isCollapsed ? (
                        <button
                            className={styles.toggleBtn}
                            onClick={onToggle}
                            title="Abrir menu"
                        >
                            <Menu size={20} />
                        </button>
                    ) : (
                        <>
                            <div className={styles.appBrand}>
                                <div className={styles.appIcon}>
                                    <CreditCard size={22} />
                                </div>
                                <div className={styles.appBrandText}>
                                    <span className={styles.appName}>Reembolso</span>
                                    <span className={styles.appTagline}>Gestão</span>
                                </div>
                            </div>
                            <button
                                className={styles.toggleBtnLight}
                                onClick={onToggle}
                                title="Recolher menu"
                            >
                                <ChevronLeft size={18} />
                            </button>
                        </>
                    )}
                </div>
                <nav className={styles.nav}>
                    <NavLink
                        to="/"
                        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                        end
                        title="Reembolso"
                        onClick={() => {
                            window.innerWidth < 768 && onToggle();
                        }}
                    >
                        <Receipt size={20} />
                        {!isCollapsed && <span>Reembolso</span>}
                    </NavLink>
                    <NavLink
                        to="/historico"
                        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                        title="Histórico"
                        onClick={() => {
                            window.innerWidth < 768 && onToggle();
                        }}
                    >
                        <History size={20} />
                        {!isCollapsed && <span>Histórico</span>}
                    </NavLink>
                    <NavLink
                        to="/pagamentos"
                        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                        title="Meus Pagamentos"
                        onClick={() => {
                            window.innerWidth < 768 && onToggle();
                        }}
                    >
                        <Wallet size={20} />
                        {!isCollapsed && <span>Meus Pagamentos</span>}
                    </NavLink>
                    {isExecutivoFinanceiro && (
                        <NavLink
                            to="/gestao"
                            className={({ isActive }) => `${styles.navItem} ${styles.navItemGestao} ${isActive ? styles.active : ''}`}
                            title="Gestão Financeira"
                            onClick={() => {
                                window.innerWidth < 768 && onToggle();
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="1" x2="12" y2="23" />
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                            {!isCollapsed && <span>Gestão Financeira</span>}
                        </NavLink>
                    )}
                </nav>
            </aside>
        </>
    );
};

export default Sidebar;
