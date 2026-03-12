/**
 * Geometry utilities for boundary validation.
 * Uses ray-casting algorithm for point-in-polygon checks.
 */

/** Check if a point [lng, lat] is inside a GeoJSON polygon ring (array of [lng, lat]). */
export function pointInPolygon(
  point: [number, number],
  ring: [number, number][]
): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Check if ALL vertices of a polygon are inside a parent polygon. */
export function polygonInsidePolygon(
  childCoords: [number, number][],
  parentCoords: [number, number][]
): boolean {
  // Check every vertex of the child (skip the closing point if it matches the first)
  const ring =
    childCoords.length > 1 &&
    childCoords[0][0] === childCoords[childCoords.length - 1][0] &&
    childCoords[0][1] === childCoords[childCoords.length - 1][1]
      ? childCoords.slice(0, -1)
      : childCoords;

  return ring.every((vertex) => pointInPolygon(vertex, parentCoords));
}

/** Check if a point {lat, lng} is inside a GeoJSON Polygon. */
export function pointInsideBounds(
  point: { lat: number; lng: number },
  bounds: GeoJSON.Polygon
): boolean {
  const ring = bounds.coordinates[0] as [number, number][];
  return pointInPolygon([point.lng, point.lat], ring);
}

/** Check if all vertices of a GeoJSON Polygon are inside a parent GeoJSON Polygon. */
export function boundsInsideBounds(
  child: GeoJSON.Polygon,
  parent: GeoJSON.Polygon
): boolean {
  const childRing = child.coordinates[0] as [number, number][];
  const parentRing = parent.coordinates[0] as [number, number][];
  return polygonInsidePolygon(childRing, parentRing);
}

/** Check if two line segments intersect. */
function segmentsIntersect(
  a1: [number, number], a2: [number, number],
  b1: [number, number], b2: [number, number]
): boolean {
  const d1 = cross(b1, b2, a1);
  const d2 = cross(b1, b2, a2);
  const d3 = cross(a1, a2, b1);
  const d4 = cross(a1, a2, b2);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  if (d1 === 0 && onSegment(b1, b2, a1)) return true;
  if (d2 === 0 && onSegment(b1, b2, a2)) return true;
  if (d3 === 0 && onSegment(a1, a2, b1)) return true;
  if (d4 === 0 && onSegment(a1, a2, b2)) return true;
  return false;
}

function cross(o: [number, number], a: [number, number], b: [number, number]): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function onSegment(p: [number, number], q: [number, number], r: [number, number]): boolean {
  return Math.min(p[0], q[0]) <= r[0] && r[0] <= Math.max(p[0], q[0]) &&
         Math.min(p[1], q[1]) <= r[1] && r[1] <= Math.max(p[1], q[1]);
}

/** Normalize a ring: remove closing duplicate if present. */
function normalizeRing(coords: [number, number][]): [number, number][] {
  if (coords.length > 1 &&
    coords[0][0] === coords[coords.length - 1][0] &&
    coords[0][1] === coords[coords.length - 1][1]) {
    return coords.slice(0, -1);
  }
  return coords;
}

/**
 * Check if two polygons overlap (share any interior area).
 * Detects: edge intersections, one polygon fully inside the other.
 */
export function polygonsOverlap(
  polyA: [number, number][],
  polyB: [number, number][]
): boolean {
  const a = normalizeRing(polyA);
  const b = normalizeRing(polyB);

  // Check edge intersections
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i], a2 = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++) {
      const b1 = b[j], b2 = b[(j + 1) % b.length];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }

  // Check if one polygon is entirely inside the other
  if (a.length > 0 && pointInPolygon(a[0], polyB)) return true;
  if (b.length > 0 && pointInPolygon(b[0], polyA)) return true;

  return false;
}

/** Check if a GeoJSON Polygon overlaps with any polygon in an array. Returns the name of the first overlap or null. */
export function findOverlappingSibling(
  polygon: [number, number][],
  siblings: { id: string; nombre: string; bounds: GeoJSON.Polygon }[]
): string | null {
  for (const s of siblings) {
    const siblingRing = s.bounds.coordinates[0] as [number, number][];
    if (polygonsOverlap(polygon, siblingRing)) {
      return s.nombre;
    }
  }
  return null;
}

/**
 * Get bounding box of a GeoJSON Polygon with optional padding factor.
 * Returns [[west, south], [east, north]] suitable for MapLibre fitBounds/maxBounds.
 */
export function getPolygonBBox(
  polygon: GeoJSON.Polygon,
  padding = 0.3
): [[number, number], [number, number]] {
  const coords = polygon.coordinates[0] as [number, number][];
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const lngPad = (east - west) * padding;
  const latPad = (north - south) * padding;
  return [
    [west - lngPad, south - latPad],
    [east + lngPad, north + latPad],
  ];
}
