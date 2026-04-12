import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Menu } from 'lucide-react';
import styles from './Layout.module.css';

const Header = ({ onMenuToggle }) => {
    const { user, signOut } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };

        if (showUserMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showUserMenu]);

    const handleLogout = async () => {
        try {
            await signOut();
            setShowUserMenu(false);
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    };

    const getUserName = () => {
        let name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0];
        if (!name) return 'Usuário';

        // Format "daniel.ribeiro" to "Daniel Ribeiro" if it looks like a username
        if (name.includes('.') && name === name.toLowerCase()) {
            return name
                .split('.')
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ');
        }
        return name;
    };

    const getUserInitial = () => {
        const name = getUserName();
        return name.charAt(0).toUpperCase();
    };

    return (
        <header className={styles.header}>
            <div className={styles.headerContent}>
                <div className={styles.headerLeft}>
                    {isMobile && onMenuToggle && (
                        <button className={styles.mobileMenuBtn} onClick={onMenuToggle}>
                            <Menu size={24} />
                        </button>
                    )}
                    <h2 className={styles.pageTitle}>Gestão Reembolso</h2>
                </div>
                <div className={styles.userInfo} ref={menuRef}>
                    <span className={styles.userName}>{getUserName()}</span>
                    <div
                        className={styles.userAvatar}
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: '#D1FAE5',
                            color: '#059669',
                            fontWeight: '600',
                            border: '2px solid white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                        {getUserInitial()}
                    </div>

                    {showUserMenu && (
                        <div className={styles.userMenu}>
                            <div className={styles.userMenuHeader}>
                                <div className={styles.userMenuAvatar}>
                                    {getUserInitial()}
                                </div>
                                <div>
                                    <div className={styles.userMenuName}>{getUserName()}</div>
                                    <div className={styles.userMenuEmail}>{user?.email}</div>
                                </div>
                            </div>
                            <div className={styles.userMenuDivider}></div>
                            <button className={styles.userMenuLogout} onClick={handleLogout}>
                                <LogOut size={16} />
                                <span>Sair</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
