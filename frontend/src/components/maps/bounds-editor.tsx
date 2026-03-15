'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Map, MapControls, useMap } from '@/components/ui/map';
import { Button } from '@/components/ui/button';
import { Trash2, Satellite, MapIcon, LocateFixed } from 'lucide-react';
import { pointInPolygon, polygonInsidePolygon, getPolygonBBox, findOverlappingSibling } from '@/lib/geo';
import type MapLibreGL from 'maplibre-gl';

interface BoundsEditorProps {
  value?: GeoJSON.Polygon | null;
  onChange: (bounds: GeoJSON.Polygon | null) => void;
  parentBounds?: GeoJSON.Polygon | null;
  siblingPolygons?: { id: string; nombre: string; bounds: GeoJSON.Polygon }[];
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [-79.9, -2.2];
const DEFAULT_ZOOM = 10;

const SATELLITE_STYLE: MapLibreGL.StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'satellite-layer',
      type: 'raster',
      source: 'satellite',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

const SIBLING_COLORS = ['#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

interface BoundsInteractionProps {
  vertices: [number, number][];
  closed: boolean;
  parentBounds?: GeoJSON.Polygon | null;
  siblingPolygons?: { id: string; nombre: string; bounds: GeoJSON.Polygon }[];
  value?: GeoJSON.Polygon | null;
  onClickMap: (lngLat: [number, number]) => void;
  onInitialValue: (verts: [number, number][]) => void;
  onError: (message: string) => void;
  isSatellite: boolean;
  recenterTrigger: number;
}

function BoundsInteraction({
  vertices,
  closed,
  parentBounds,
  siblingPolygons,
  value,
  onClickMap,
  onInitialValue,
  onError,
  isSatellite,
  recenterTrigger,
}: BoundsInteractionProps) {
  const { map, isLoaded } = useMap();
  const layersAddedRef = useRef(false);
  const initialValueAppliedRef = useRef(false);

  // Add all sources and layers
  const addLayers = useCallback(
    (m: MapLibreGL.Map) => {
      // Parent bounds layer (dashed outline)
      if (!m.getSource('parent-bounds-source')) {
        m.addSource('parent-bounds-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!m.getLayer('parent-bounds-line')) {
        m.addLayer({
          id: 'parent-bounds-line',
          type: 'line',
          source: 'parent-bounds-source',
          paint: {
            'line-color': '#94a3b8',
            'line-width': 2,
            'line-dasharray': [4, 3],
          },
        });
      }

      // Sibling polygon layers (read-only overlays)
      if (siblingPolygons) {
        for (let i = 0; i < siblingPolygons.length; i++) {
          const s = siblingPolygons[i];
          const color = SIBLING_COLORS[i % SIBLING_COLORS.length];
          const sourceId = `sibling-${s.id}-source`;
          const fillId = `sibling-${s.id}-fill`;
          const lineId = `sibling-${s.id}-line`;
          const labelId = `sibling-${s.id}-label`;

          if (!m.getSource(sourceId)) {
            m.addSource(sourceId, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: s.bounds,
              },
            });
          }
          if (!m.getLayer(fillId)) {
            m.addLayer({
              id: fillId,
              type: 'fill',
              source: sourceId,
              paint: {
                'fill-color': color,
                'fill-opacity': isSatellite ? 0.3 : 0.12,
              },
            });
          }
          if (!m.getLayer(lineId)) {
            m.addLayer({
              id: lineId,
              type: 'line',
              source: sourceId,
              paint: {
                'line-color': color,
                'line-width': isSatellite ? 3 : 2,
              },
            });
          }
          if (!m.getLayer(labelId)) {
            m.addLayer({
              id: labelId,
              type: 'symbol',
              source: sourceId,
              layout: {
                'text-field': s.nombre,
                'text-size': 12,
                'text-anchor': 'center',
              },
              paint: {
                'text-color': color,
                'text-halo-color': '#ffffff',
                'text-halo-width': 1.5,
              },
            });
          }
        }
      }

      // Drawing polygon layer
      if (!m.getSource('polygon-source')) {
        m.addSource('polygon-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!m.getLayer('polygon-fill')) {
        m.addLayer({
          id: 'polygon-fill',
          type: 'fill',
          source: 'polygon-source',
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.15,
          },
        });
      }
      if (!m.getLayer('polygon-line')) {
        m.addLayer({
          id: 'polygon-line',
          type: 'line',
          source: 'polygon-source',
          paint: {
            'line-color': '#3b82f6',
            'line-width': 2,
          },
        });
      }

      // Points layer for vertices
      if (!m.getSource('vertices-source')) {
        m.addSource('vertices-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!m.getLayer('vertices-layer')) {
        m.addLayer({
          id: 'vertices-layer',
          type: 'circle',
          source: 'vertices-source',
          paint: {
            'circle-radius': 5,
            'circle-color': '#3b82f6',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });
      }

      // Cursor-following ghost point (visible while drawing)
      if (!m.getSource('cursor-point-source')) {
        m.addSource('cursor-point-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!m.getLayer('cursor-point-layer')) {
        m.addLayer({
          id: 'cursor-point-layer',
          type: 'circle',
          source: 'cursor-point-source',
          paint: {
            'circle-radius': 5,
            'circle-color': '#3b82f6',
            'circle-opacity': 0.5,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-opacity': 0.5,
          },
        });
      }

      layersAddedRef.current = true;
    },
    [siblingPolygons, isSatellite]
  );

  const removeLayers = useCallback((m: MapLibreGL.Map) => {
    try {
      if (m.getLayer('cursor-point-layer')) m.removeLayer('cursor-point-layer');
      if (m.getSource('cursor-point-source')) m.removeSource('cursor-point-source');
      if (m.getLayer('vertices-layer')) m.removeLayer('vertices-layer');
      if (m.getSource('vertices-source')) m.removeSource('vertices-source');
      if (m.getLayer('polygon-line')) m.removeLayer('polygon-line');
      if (m.getLayer('polygon-fill')) m.removeLayer('polygon-fill');
      if (m.getSource('polygon-source')) m.removeSource('polygon-source');
      // Remove sibling layers
      if (siblingPolygons) {
        for (const s of siblingPolygons) {
          if (m.getLayer(`sibling-${s.id}-label`)) m.removeLayer(`sibling-${s.id}-label`);
          if (m.getLayer(`sibling-${s.id}-line`)) m.removeLayer(`sibling-${s.id}-line`);
          if (m.getLayer(`sibling-${s.id}-fill`)) m.removeLayer(`sibling-${s.id}-fill`);
          if (m.getSource(`sibling-${s.id}-source`)) m.removeSource(`sibling-${s.id}-source`);
        }
      }
      if (m.getLayer('parent-bounds-line')) m.removeLayer('parent-bounds-line');
      if (m.getSource('parent-bounds-source')) m.removeSource('parent-bounds-source');
    } catch {
      // ignore
    }
    layersAddedRef.current = false;
  }, [siblingPolygons]);

  // Set up layers and re-add on style changes
  useEffect(() => {
    if (!isLoaded || !map) return;

    addLayers(map);

    const handleStyleLoad = () => {
      // Re-add layers after style change (satellite toggle, theme change)
      layersAddedRef.current = false;
      addLayers(map);
      // Re-apply current data after re-adding layers
      updatePolygonData(map, vertices, closed);
      updateParentData(map, parentBounds ?? null);
      updateSiblingData(map, siblingPolygons);
    };

    map.on('style.load', handleStyleLoad);

    return () => {
      map.off('style.load', handleStyleLoad);
      removeLayers(map);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map, addLayers, removeLayers]);

  // Click handler — ignore clicks that are part of a drag/pan
  useEffect(() => {
    if (!isLoaded || !map) return;

    let mouseDownPos: { x: number; y: number } | null = null;
    const DRAG_THRESHOLD = 5; // pixels

    const onMouseDown = (e: MapLibreGL.MapMouseEvent) => {
      mouseDownPos = { x: e.point.x, y: e.point.y };
    };

    const handler = (e: MapLibreGL.MapMouseEvent) => {
      if (closed) return;
      // If mouse moved more than threshold between down and up, it was a drag
      if (mouseDownPos) {
        const dx = e.point.x - mouseDownPos.x;
        const dy = e.point.y - mouseDownPos.y;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) return;
      }
      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      if (parentBounds) {
        const parentRing = parentBounds.coordinates[0] as [number, number][];
        if (!pointInPolygon(point, parentRing)) {
          onError('El punto debe estar dentro de los limites del local/area');
          return;
        }
      }
      onClickMap(point);
    };

    const onMouseMove = (e: MapLibreGL.MapMouseEvent) => {
      if (closed) return;
      const source = map.getSource('cursor-point-source') as MapLibreGL.GeoJSONSource | undefined;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: { type: 'Point', coordinates: [e.lngLat.lng, e.lngLat.lat] },
          }],
        });
      }
    };

    // Show crosshair while drawing
    if (!closed) {
      map.getCanvas().style.cursor = 'crosshair';
    }

    map.on('mousedown', onMouseDown);
    map.on('click', handler);
    map.on('mousemove', onMouseMove);
    return () => {
      try {
        map.off('mousedown', onMouseDown);
        map.off('click', handler);
        map.off('mousemove', onMouseMove);
        map.getCanvas().style.cursor = '';
        const source = map.getSource('cursor-point-source') as MapLibreGL.GeoJSONSource | undefined;
        if (source) source.setData({ type: 'FeatureCollection', features: [] });
      } catch { /* map may already be destroyed */ }
    };
  }, [isLoaded, map, closed, onClickMap, parentBounds, onError]);

  // Update polygon and vertex sources when vertices/closed change
  useEffect(() => {
    if (!isLoaded || !map || !layersAddedRef.current) return;
    updatePolygonData(map, vertices, closed);
  }, [isLoaded, map, vertices, closed]);

  // Update parent bounds source
  useEffect(() => {
    if (!isLoaded || !map || !layersAddedRef.current) return;
    updateParentData(map, parentBounds ?? null);
  }, [isLoaded, map, parentBounds]);

  // Update sibling polygon sources
  useEffect(() => {
    if (!isLoaded || !map || !layersAddedRef.current) return;
    updateSiblingData(map, siblingPolygons);
  }, [isLoaded, map, siblingPolygons]);

  // Show existing value on mount
  useEffect(() => {
    if (!isLoaded || !map || !value || initialValueAppliedRef.current) return;
    initialValueAppliedRef.current = true;
    const ring = value.coordinates[0] as [number, number][];
    const verts = ring.slice(0, -1);
    onInitialValue(verts);
  }, [isLoaded, map, value, onInitialValue]);

  // Fit to parent bounds when map is ready
  useEffect(() => {
    if (!isLoaded || !map || !parentBounds) return;

    const coords = parentBounds.coordinates[0] as [number, number][];
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 40, duration: 0 }
    );
  }, [isLoaded, map, parentBounds]);

  // Adjust paint properties for satellite contrast
  useEffect(() => {
    if (!isLoaded || !map) return;
    try {
      if (map.getLayer('parent-bounds-line')) {
        map.setPaintProperty('parent-bounds-line', 'line-color', isSatellite ? '#ffffff' : '#94a3b8');
        map.setPaintProperty('parent-bounds-line', 'line-width', isSatellite ? 3 : 2);
      }
      if (map.getLayer('polygon-fill')) {
        map.setPaintProperty('polygon-fill', 'fill-opacity', isSatellite ? 0.35 : 0.15);
      }
      if (map.getLayer('polygon-line')) {
        map.setPaintProperty('polygon-line', 'line-color', isSatellite ? '#93c5fd' : '#3b82f6');
        map.setPaintProperty('polygon-line', 'line-width', isSatellite ? 3 : 2);
      }
      if (map.getLayer('vertices-layer')) {
        map.setPaintProperty('vertices-layer', 'circle-radius', isSatellite ? 7 : 5);
        map.setPaintProperty('vertices-layer', 'circle-color', isSatellite ? '#93c5fd' : '#3b82f6');
        map.setPaintProperty('vertices-layer', 'circle-stroke-width', isSatellite ? 3 : 2);
      }
      if (map.getLayer('cursor-point-layer')) {
        map.setPaintProperty('cursor-point-layer', 'circle-radius', isSatellite ? 7 : 5);
        map.setPaintProperty('cursor-point-layer', 'circle-color', isSatellite ? '#93c5fd' : '#3b82f6');
        map.setPaintProperty('cursor-point-layer', 'circle-stroke-width', isSatellite ? 3 : 2);
      }
      // Adjust sibling layer opacities for satellite contrast
      if (siblingPolygons) {
        for (const s of siblingPolygons) {
          if (map.getLayer(`sibling-${s.id}-fill`)) {
            map.setPaintProperty(`sibling-${s.id}-fill`, 'fill-opacity', isSatellite ? 0.3 : 0.12);
          }
          if (map.getLayer(`sibling-${s.id}-line`)) {
            map.setPaintProperty(`sibling-${s.id}-line`, 'line-width', isSatellite ? 3 : 2);
          }
        }
      }
    } catch {
      // layers may not exist yet
    }
  }, [isLoaded, map, isSatellite, siblingPolygons]);

  // Restrict zoom-out to parent bounds area
  useEffect(() => {
    if (!isLoaded || !map || !parentBounds) return;
    const bbox = getPolygonBBox(parentBounds, 0.5);
    map.setMaxBounds(bbox);
    return () => {
      try { map.setMaxBounds(null); } catch { /* ignore */ }
    };
  }, [isLoaded, map, parentBounds]);

  // Recenter to parent bounds on trigger
  useEffect(() => {
    if (!isLoaded || !map || !parentBounds || recenterTrigger === 0) return;
    const bbox = getPolygonBBox(parentBounds, 0);
    map.fitBounds(bbox, { padding: 40, duration: 300 });
  }, [isLoaded, map, parentBounds, recenterTrigger]);

  return null;
}

function updatePolygonData(
  map: MapLibreGL.Map,
  coords: [number, number][],
  isClosed: boolean
) {
  const polySource = map.getSource('polygon-source') as MapLibreGL.GeoJSONSource | undefined;
  const vertSource = map.getSource('vertices-source') as MapLibreGL.GeoJSONSource | undefined;

  if (polySource) {
    if (coords.length >= 3 && isClosed) {
      polySource.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [[...coords, coords[0]]] },
      });
    } else if (coords.length >= 2) {
      polySource.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords },
      });
    } else {
      polySource.setData({ type: 'FeatureCollection', features: [] });
    }
  }

  if (vertSource) {
    vertSource.setData({
      type: 'FeatureCollection',
      features: coords.map((c) => ({
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'Point' as const, coordinates: c },
      })),
    });
  }
}

function updateParentData(
  map: MapLibreGL.Map,
  bounds: GeoJSON.Polygon | null
) {
  const source = map.getSource('parent-bounds-source') as MapLibreGL.GeoJSONSource | undefined;
  if (!source) return;

  if (bounds) {
    source.setData({
      type: 'Feature',
      properties: {},
      geometry: bounds,
    });
  } else {
    source.setData({ type: 'FeatureCollection', features: [] });
  }
}

function updateSiblingData(
  map: MapLibreGL.Map,
  siblingPolygons?: { id: string; nombre: string; bounds: GeoJSON.Polygon }[]
) {
  if (!siblingPolygons) return;
  for (const s of siblingPolygons) {
    const source = map.getSource(`sibling-${s.id}-source`) as MapLibreGL.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: s.bounds,
      });
    }
  }
}

export function BoundsEditor({ value, onChange, parentBounds, siblingPolygons, className }: BoundsEditorProps) {
  const [vertices, setVertices] = useState<[number, number][]>([]);
  const [closed, setClosed] = useState(false);
  const [isSatellite, setIsSatellite] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  const initialCenter = parentBounds
    ? getCenterOfPolygon(parentBounds.coordinates[0] as [number, number][])
    : value
      ? getCenterOfPolygon(value.coordinates[0] as [number, number][])
      : DEFAULT_CENTER;

  const initialZoom = parentBounds || value ? 13 : DEFAULT_ZOOM;

  const mapStyles = useMemo(() => {
    if (isSatellite) {
      return { light: SATELLITE_STYLE, dark: SATELLITE_STYLE };
    }
    return undefined; // use default Carto styles
  }, [isSatellite]);

  const handleError = useCallback((message: string) => {
    setError(message);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(null), 3000);
  }, []);

  const handleClickMap = useCallback((lngLat: [number, number]) => {
    setVertices((prev) => [...prev, lngLat]);
  }, []);

  const handleInitialValue = useCallback((verts: [number, number][]) => {
    setVertices(verts);
    setClosed(true);
  }, []);

  const handleClose = useCallback(() => {
    if (vertices.length < 3) return;
    if (parentBounds) {
      const parentRing = parentBounds.coordinates[0] as [number, number][];
      if (!polygonInsidePolygon(vertices, parentRing)) {
        handleError('Todos los vertices deben estar dentro de los limites del local/area');
        return;
      }
    }
    if (siblingPolygons && siblingPolygons.length > 0) {
      const overlapName = findOverlappingSibling(vertices, siblingPolygons);
      if (overlapName) {
        handleError(`El poligono se superpone con: ${overlapName}`);
        return;
      }
    }
    setClosed(true);
    const ring = [...vertices, vertices[0]];
    onChange({ type: 'Polygon', coordinates: [ring] });
  }, [vertices, onChange, parentBounds, siblingPolygons, handleError]);

  const handleClear = useCallback(() => {
    setVertices([]);
    setClosed(false);
    onChange(null);
  }, [onChange]);

  return (
    <div className={className}>
      <div className="relative h-[300px] rounded-md border overflow-hidden">
        <Map
          center={initialCenter}
          zoom={initialZoom}
          className="h-full w-full"
          styles={mapStyles}
        >
          <BoundsInteraction
            vertices={vertices}
            closed={closed}
            parentBounds={parentBounds}
            siblingPolygons={siblingPolygons}
            value={value}
            onClickMap={handleClickMap}
            onInitialValue={handleInitialValue}
            onError={handleError}
            isSatellite={isSatellite}
            recenterTrigger={recenterTrigger}
          />
          <MapControls position="bottom-right" showZoom />
        </Map>
        <div className="absolute top-2 left-2 z-10 flex gap-1">
          {parentBounds && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-8 shadow-md"
              onClick={() => setRecenterTrigger((n) => n + 1)}
              title="Centrar en el area"
            >
              <LocateFixed className="size-4" />
            </Button>
          )}
          {vertices.length >= 3 && !closed && (
            <Button type="button" variant="secondary" size="sm" onClick={handleClose}>
              Cerrar poligono
            </Button>
          )}
          {(vertices.length > 0 || closed) && (
            <Button type="button" variant="secondary" size="sm" onClick={handleClear}>
              <Trash2 className="size-3 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
        <div className="absolute top-2 right-2 z-10">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsSatellite((prev) => !prev)}
            title={isSatellite ? 'Vista de mapa' : 'Vista satelital'}
          >
            {isSatellite ? <MapIcon className="size-4" /> : <Satellite className="size-4" />}
          </Button>
        </div>
        {!closed && vertices.length === 0 && (
          <div className="absolute bottom-2 left-2 z-10 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">
            Haz clic en el mapa para agregar vertices del poligono
          </div>
        )}
        {!closed && vertices.length > 0 && vertices.length < 3 && (
          <div className="absolute bottom-2 left-2 z-10 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">
            Agrega al menos {3 - vertices.length} vertice(s) mas para cerrar el poligono
          </div>
        )}
        {error && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 rounded bg-destructive/90 px-3 py-1.5 text-xs text-destructive-foreground shadow-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function getCenterOfPolygon(coords: [number, number][]): [number, number] {
  const ring = coords.slice(0, -1);
  if (ring.length === 0) return DEFAULT_CENTER;
  const lng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
  const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
  return [lng, lat];
}
