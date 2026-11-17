import { useEffect, type RefObject } from 'react';
import type { LaunchSettings } from '@/lib/space-twin/launch';

export interface LaunchProps {
    launch?: LaunchSettings;
    launchRef?: RefObject<(() => void) | null>;
    onLaunchReady?: () => void;
}

/** Register the loaded experience's action so audio unlock runs inside the original click. */
export function useLaunchAction({ launchRef, onLaunchReady }: LaunchProps, action: () => void) {
    useEffect(() => {
        if (!launchRef) return;
        launchRef.current = action;
        onLaunchReady?.();
        return () => { launchRef.current = null; };
    }, [launchRef, onLaunchReady, action]);
}
