import type { ReactNode } from 'react';

import styles from '@/app/views.module.css';

type PanelHeaderProps = {
  title: string;
  actions?: ReactNode;
};

const PanelHeader = ({ actions }: PanelHeaderProps) => (
  actions ? (
    <div className={styles['view__panel-header']}>
      <div className={styles['view__panel-actions']}>{actions}</div>
    </div>
  ) : null
);

export default PanelHeader;
