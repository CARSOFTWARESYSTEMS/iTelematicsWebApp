"use client";
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Light scroll reveal for elements marked data-reveal. Content is visible by default; the
 * effect is only switched on in browsers that allow motion, so nothing depends on it.
 */
export default function Reveal() {
    const pathname = usePathname();

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') return;
        const targets = Array.from(document.querySelectorAll('[data-reveal]:not(.is-visible)'));
        if (targets.length === 0) return;
        document.documentElement.classList.add('reveal-on');
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            },
            { rootMargin: '0px 0px -8% 0px' },
        );
        targets.forEach((t) => observer.observe(t));
        return () => observer.disconnect();
    }, [pathname]);

    return null;
}
