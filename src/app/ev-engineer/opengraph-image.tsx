import { ImageResponse } from 'next/og';

export const alt = 'EV.ENGINEER™: Energy, Battery, Space, Aerospace and Digital Twins';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '72px',
                    background: '#050B12',
                    color: '#F8FAFC',
                    fontFamily: 'sans-serif',
                }}
            >
                <div style={{ display: 'flex', fontSize: 22, letterSpacing: 4, color: '#22D3EE' }}>EV.ENGINEER™ · ENGINEERING &amp; RESEARCH</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', fontSize: 104, fontWeight: 700, letterSpacing: -4 }}>EV.ENGINEER™</div>
                    <div style={{ display: 'flex', fontSize: 38, color: '#A7B3C4' }}>Building world-class engineers for energy and battery challenges</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, color: '#8291A7' }}>
                    <span>ENERGY · BATTERY · SPACE · AEROSPACE · DIGITAL TWINS · CYBERSECURITY</span>
                    <span>BENGALURU</span>
                </div>
            </div>
        ),
        size,
    );
}
