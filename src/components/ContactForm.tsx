"use client";
import { useState } from 'react';
import styles from './ContactForm.module.css';

export default function ContactForm() {
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate submission
        setTimeout(() => {
            setSubmitted(true);
        }, 500);
    };

    return (
        <div className={styles.formCard}>
            {submitted ? (
                <div className={styles.successMessage}>
                    <h3>Message Sent!</h3>
                    <p>Thank you for reaching out. We will get back to you shortly.</p>
                    <button
                        onClick={() => setSubmitted(false)}
                        className="btn btn-secondary"
                        style={{ marginTop: '1rem', fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                    >
                        Send another
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <div className={styles.gridRow}>
                        <div className={styles.formGroup}>
                            <label htmlFor="name" className={styles.formLabel}>Full Name *</label>
                            <input type="text" id="name" required className={styles.input} placeholder="John Doe" />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="company" className={styles.formLabel}>Company Name</label>
                            <input type="text" id="company" className={styles.input} placeholder="Company Ltd." />
                        </div>
                    </div>

                    <div className={styles.gridRow}>
                        <div className={styles.formGroup}>
                            <label htmlFor="email" className={styles.formLabel}>Work Email *</label>
                            <input type="email" id="email" required className={styles.input} placeholder="john@company.com" />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="phone" className={styles.formLabel}>Phone Number</label>
                            <input type="tel" id="phone" className={styles.input} placeholder="+91 98765 43210" />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="interest" className={styles.formLabel}>Area of Interest</label>
                        <select id="interest" className={styles.select}>
                            <option value="">Select an option</option>
                            <option value="ev-diagnostics">EV Diagnostics</option>
                            <option value="telematics">Telematics Platform</option>
                            <option value="bms">Battery Intelligence</option>
                            <option value="training">Corporate Training</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="message" className={styles.formLabel}>Message</label>
                        <textarea id="message" required className={styles.textarea} placeholder="Tell us about your project..." />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', borderRadius: '12px', padding: '1rem' }}>
                        Send Message
                    </button>

                    <p className={styles.privacyNote}>
                        By sending this message, you agree to our privacy policy.
                    </p>
                </form>
            )}
        </div>
    );
}
