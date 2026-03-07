'use client';

import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/app/views.module.css';

interface ContextMenuProps {
  anchor: DOMRect;
  onClose: () => void;
  children: ReactNode;
}

const ContextMenu = ({ anchor, onClose, children }: ContextMenuProps) => {
  const style: React.CSSProperties = {
    position: 'fixed',
    top: anchor.bottom + 4,
    right: window.innerWidth - anchor.right,
    zIndex: 9999,
  };

  return createPortal(
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onClick={onClose}
      />
      <div className={styles['view__menu']} style={style}>
        {children}
      </div>
    </>,
    document.body,
  );
};

export default ContextMenu;
