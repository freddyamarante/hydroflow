import { point, polygon } from '@turf/helpers';
import booleanContains from '@turf/boolean-contains';
import booleanDisjoint from '@turf/boolean-disjoint';
import intersect from '@turf/intersect';

export type ClipResult =
  | { status: 'unchanged' }
  | { status: 'clipped'; bounds: GeoJSON.Polygon }
  | { status: 'outside' };

/**
 * Clip a child polygon to fit within a parent polygon.
 * Works for area-in-local and sector-in-area clipping.
 * Returns 'unchanged' if fully inside, 'clipped' with the intersection polygon
 * if partially overlapping, or 'outside' if fully disjoint / intersection is MultiPolygon.
 */
/** Shoelace formula for polygon area (works with any coordinate units). */
function ringArea(coords: number[][]): number {
  let area = 0;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    area += (coords[j][0] + coords[i][0]) * (coords[j][1] - coords[i][1]);
  }
  return Math.abs(area / 2);
}

const CLIP_TOLERANCE = 0.05; // 5% — if >=95% of child area is inside, treat as unchanged

export function clipBounds(
  childBounds: GeoJSON.Polygon,
  parentBounds: GeoJSON.Polygon,
): ClipResult {
  const childPoly = polygon(childBounds.coordinates);
  const parentPoly = polygon(parentBounds.coordinates);

  if (booleanContains(parentPoly, childPoly)) {
    return { status: 'unchanged' };
  }

  if (booleanDisjoint(parentPoly, childPoly)) {
    return { status: 'outside' };
  }

  const result = intersect(
    { type: 'FeatureCollection', features: [childPoly, parentPoly] },
  );

  if (!result || result.geometry.type !== 'Polygon') {
    return { status: 'outside' };
  }

  // If the intersection covers >= 95% of the child area, treat as unchanged
  const childArea = ringArea(childBounds.coordinates[0]);
  const clippedArea = ringArea((result.geometry as GeoJSON.Polygon).coordinates[0]);
  if (childArea > 0 && clippedArea / childArea >= 1 - CLIP_TOLERANCE) {
    return { status: 'unchanged' };
  }

  return { status: 'clipped', bounds: result.geometry as GeoJSON.Polygon };
}

/**
 * Check if a {lat, lng} point is inside a polygon.
 */
export function isPointInsideBounds(
  pos: { lat: number; lng: number },
  bounds: GeoJSON.Polygon,
): boolean {
  return booleanContains(polygon(bounds.coordinates), point([pos.lng, pos.lat]));
}
