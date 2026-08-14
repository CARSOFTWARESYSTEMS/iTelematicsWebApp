import type { Metadata } from 'next';
import MyRegistrationClient from './MyRegistrationClient';
import styles from './my-registration.module.css';

export const metadata: Metadata = {
    title: 'View My Registration | iTelematics Events & Registration',
    description: 'Verify an iTelematics event registration reference.',
};

export default function MyRegistrationPage() {
    return (
        <div className="container">
            <div className={styles.page}>
                <MyRegistrationClient />
            </div>
        </div>
    );
}
