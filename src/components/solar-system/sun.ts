import { Color, LinearSRGBColorSpace, Vector3 } from 'three';

/**
 * The Sun at the launch site, in the site frame (x east, y up, z south), which is also the inertial
 * frame at liftoff. Late-morning Sun, east-south-east and 47.9° up: the direction of the Sun in the
 * photographed sky used at the pad (Poly Haven "Kloofendal 48d Partly Cloudy", rotated so the Sun's
 * azimuth matches), so shadows, highlights and the sky agree.
 */
export const SUN = new Vector3(0.6302, 0.7419, 0.2294).normalize();

/**
 * Light levels measured from that sky (linear radiance units of the HDR image, sun disc integrated):
 * direct sunlight 4.3 on a surface facing the Sun, skylight 1.7 on a horizontal surface. The scene's
 * sun light and image-based light use these values so the balance between them is the photographed one.
 */
export const SUN_IRRADIANCE = 4.3;

/** Average sky radiance at the horizon (linear): distant haze blends into the photographed sky. */
export const HORIZON = new Color().setRGB(0.42, 0.45, 0.55, LinearSRGBColorSpace);
