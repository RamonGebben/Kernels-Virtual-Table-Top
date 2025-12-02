import type { ReactNode } from 'react';

import styles from '@/app/views.module.css';

type PanelHeaderProps = {
  title: string;
  actions?: ReactNode;
};

const PanelHeader = ({ title, actions }: PanelHeaderProps) => (
  <div className={styles['view__panel-header']}>
    <span className={styles['view__panel-title']}>{title}</span>
    {actions ? (
      <div className={styles['view__panel-actions']}>{actions}</div>
    ) : null}
  </div>
);

export default PanelHeader;
