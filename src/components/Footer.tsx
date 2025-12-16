import styles from './Footer.module.css';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={`container ${styles.container}`}>
                <div className={styles.companyInfo}>
                    <h4>iTelematics Software Private Limited</h4>
                    <p>© {new Date().getFullYear()} All rights reserved.</p>
                </div>

                <div className={styles.centerContact}>
                    <a href="mailto:info@iTelematics.com">✉️ info@iTelematics.com</a>
                </div>

                <div className={styles.poweredBy}>
                    Powered by <span className={styles.evEngineer}>EV.ENGINEER™</span>
                </div>
            </div>
        </footer>
    );
}
