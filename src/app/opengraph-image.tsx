import { ImageResponse } from 'next/og';
import { FLAGSHIP, SITE } from '@/lib/site';

export const alt = 'iTelematics: Satellite Engineering R&D and internships';
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 22, border: '3px solid #22D3EE' }} />
                    <div style={{ fontSize: 34, fontWeight: 700 }}>iTelematics</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div style={{ fontSize: 22, letterSpacing: 4, color: '#22D3EE' }}>INTERN-DRIVEN SATELLITE ENGINEERING R&amp;D</div>
                    <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2 }}>Satellite Engineering</div>
                    <div style={{ fontSize: 30, color: '#94A3B8' }}>{`Flagship R&D: ${FLAGSHIP}`}</div>
                </div>
                <div style={{ display: 'flex', fontSize: 22, color: '#8291A7' }}>{SITE.descriptor}</div>
            </div>
        ),
        size,
    );
}
