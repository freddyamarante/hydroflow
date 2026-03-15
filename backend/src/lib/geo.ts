import { polygon } from '@turf/helpers';
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

  return { status: 'clipped', bounds: result.geometry as GeoJSON.Polygon };
}
