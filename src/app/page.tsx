import Link from 'next/link';
import styles from './page.module.css';

const Home = () => {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Kernel Virtual Tabletop</h1>
          <p>Free, fast, and ready for your next session. Pick your role to begin.</p>
        </header>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/dm">
            Join as DM
          </Link>
          <Link className={styles.secondary} href="/table">
            Join as Table
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Home;
