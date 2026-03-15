'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Map, MapControls, MapMarker, MarkerContent, useMap } from '@/components/ui/map';
import { Button } from '@/components/ui/button';
import { Trash2, MapPin, Layers, LocateFixed } from 'lucide-react';
import { pointInsideBounds, getPolygonBBox } from '@/lib/geo';
import type MapLibreGL from 'maplibre-gl';

interface PointEditorProps {
  value?: { lat: number; lng: number } | null;
  onChange: (pos: { lat: number; lng: number } | null) => void;
  parentBounds?: GeoJSON.Polygon | null;
  siblingPoints?: { id: string; nombre: string; posicion: { lat: number; lng: number } }[];
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

/** Inner component that uses useMap() to interact with the map instance directly. */
function PointInteraction({
  parentBounds,
  position,
  onPositionChange,
  onError,
  isSatellite,
  recenterTrigger,
  siblingPoints = [],
}: {
  parentBounds?: GeoJSON.Polygon | null;
  position: { lat: number; lng: number } | null;
  onPositionChange: (pos: { lat: number; lng: number } | null) => void;
  onError: (message: string) => void;
  isSatellite: boolean;
  recenterTrigger: number;
  siblingPoints?: { id: string; nombre: string; posicion: { lat: number; lng: number } }[];
}) {
  const { map, isLoaded } = useMap();
  const parentBoundsRef = useRef(parentBounds);
  parentBoundsRef.current = parentBounds;

  // Add parent bounds source and layer
  const addBoundsLayer = useCallback(
    (m: MapLibreGL.Map) => {
      if (m.getSource('parent-bounds-source')) return;

      m.addSource('parent-bounds-source', {
        type: 'geojson',
        data: parentBoundsRef.current
          ? {
              type: 'Feature',
              properties: {},
              geometry: parentBoundsRef.current,
            }
          : { type: 'FeatureCollection', features: [] },
      });

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
    },
    []
  );

  // Add sibling points source and layers
  const siblingPointsRef = useRef(siblingPoints);
  siblingPointsRef.current = siblingPoints;

  const addSiblingLayers = useCallback(
    (m: MapLibreGL.Map) => {
      if (m.getSource('sibling-points-source')) return;

      m.addSource('sibling-points-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: siblingPointsRef.current.map((s) => ({
            type: 'Feature' as const,
            properties: { nombre: s.nombre },
            geometry: { type: 'Point' as const, coordinates: [s.posicion.lng, s.posicion.lat] },
          })),
        },
      });

      m.addLayer({
        id: 'sibling-points-circle',
        type: 'circle',
        source: 'sibling-points-source',
        paint: {
          'circle-radius': 6,
          'circle-color': '#f59e0b',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.8,
        },
      });

      m.addLayer({
        id: 'sibling-points-label',
        type: 'symbol',
        source: 'sibling-points-source',
        layout: {
          'text-field': ['get', 'nombre'],
          'text-size': 11,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#f59e0b',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      });
    },
    []
  );

  // Setup: click handler + parent bounds layer + fit to bounds
  useEffect(() => {
    if (!isLoaded || !map) return;

    let mouseDownPos: { x: number; y: number } | null = null;
    const DRAG_THRESHOLD = 5;

    const onMouseDown = (e: MapLibreGL.MapMouseEvent) => {
      mouseDownPos = { x: e.point.x, y: e.point.y };
    };

    const handleClick = (e: MapLibreGL.MapMouseEvent) => {
      if (mouseDownPos) {
        const dx = e.point.x - mouseDownPos.x;
        const dy = e.point.y - mouseDownPos.y;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) return;
      }
      const clickedPos = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      if (parentBoundsRef.current && !pointInsideBounds(clickedPos, parentBoundsRef.current)) {
        onError('El punto debe estar dentro de los límites del sector');
        return;
      }
      onPositionChange(clickedPos);
    };

    map.on('mousedown', onMouseDown);
    map.on('click', handleClick);
    addBoundsLayer(map);
    addSiblingLayers(map);

    // Fit to parent bounds on first load
    if (parentBoundsRef.current) {
      const coords = parentBoundsRef.current.coordinates[0] as [number, number][];
      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 40, duration: 0 }
      );
    }

    return () => {
      map.off('mousedown', onMouseDown);
      map.off('click', handleClick);
      try {
        if (map.getLayer('parent-bounds-line')) map.removeLayer('parent-bounds-line');
        if (map.getSource('parent-bounds-source')) map.removeSource('parent-bounds-source');
        if (map.getLayer('sibling-points-label')) map.removeLayer('sibling-points-label');
        if (map.getLayer('sibling-points-circle')) map.removeLayer('sibling-points-circle');
        if (map.getSource('sibling-points-source')) map.removeSource('sibling-points-source');
      } catch {
        // map may already be removed
      }
    };
  }, [isLoaded, map, onPositionChange, onError, addBoundsLayer, addSiblingLayers]);

  // Update parent bounds data when it changes
  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource('parent-bounds-source') as MapLibreGL.GeoJSONSource | undefined;
    if (!source) return;

    if (parentBounds) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: parentBounds,
      });
    } else {
      source.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [isLoaded, map, parentBounds]);

  // Update sibling points data when it changes
  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource('sibling-points-source') as MapLibreGL.GeoJSONSource | undefined;
    if (!source) return;

    source.setData({
      type: 'FeatureCollection',
      features: siblingPoints.map((s) => ({
        type: 'Feature' as const,
        properties: { nombre: s.nombre },
        geometry: { type: 'Point' as const, coordinates: [s.posicion.lng, s.posicion.lat] },
      })),
    });
  }, [isLoaded, map, siblingPoints]);

  // Re-add parent bounds layer after a style change (satellite toggle)
  useEffect(() => {
    if (!isLoaded || !map) return;

    const handleStyleLoad = () => {
      // After style swap, sources/layers are gone — re-add them
      if (!map.getSource('parent-bounds-source')) {
        addBoundsLayer(map);
      }
      if (!map.getSource('sibling-points-source')) {
        addSiblingLayers(map);
      }
    };

    map.on('style.load', handleStyleLoad);
    return () => {
      map.off('style.load', handleStyleLoad);
    };
  }, [isLoaded, map, addBoundsLayer, addSiblingLayers]);

  // Adjust paint properties for satellite contrast
  useEffect(() => {
    if (!isLoaded || !map) return;
    try {
      if (map.getLayer('parent-bounds-line')) {
        map.setPaintProperty('parent-bounds-line', 'line-color', isSatellite ? '#ffffff' : '#94a3b8');
        map.setPaintProperty('parent-bounds-line', 'line-width', isSatellite ? 3 : 2);
      }
      if (map.getLayer('sibling-points-circle')) {
        map.setPaintProperty('sibling-points-circle', 'circle-radius', isSatellite ? 8 : 6);
        map.setPaintProperty('sibling-points-circle', 'circle-color', isSatellite ? '#fbbf24' : '#f59e0b');
      }
      if (map.getLayer('sibling-points-label')) {
        map.setPaintProperty('sibling-points-label', 'text-halo-width', isSatellite ? 2 : 1.5);
      }
    } catch {
      // layer may not exist yet
    }
  }, [isLoaded, map, isSatellite]);

  // Restrict zoom-out to parent bounds area
  useEffect(() => {
    if (!isLoaded || !map || !parentBoundsRef.current) return;
    const bbox = getPolygonBBox(parentBoundsRef.current, 0.5);
    map.setMaxBounds(bbox);
    return () => {
      try { map.setMaxBounds(null); } catch { /* ignore */ }
    };
  }, [isLoaded, map, parentBounds]);

  // Recenter to parent bounds on trigger
  useEffect(() => {
    if (!isLoaded || !map || !parentBoundsRef.current || recenterTrigger === 0) return;
    const bbox = getPolygonBBox(parentBoundsRef.current, 0);
    map.fitBounds(bbox, { padding: 40, duration: 300 });
  }, [isLoaded, map, recenterTrigger]);

  return null;
}

export function PointEditor({ value, onChange, parentBounds, siblingPoints = [], className }: PointEditorProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(value ?? null);
  const [isSatellite, setIsSatellite] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  const showError = useCallback((message: string) => {
    setError(message);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(null), 3000);
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const initialCenter = parentBounds
    ? getCenterOfPolygon(parentBounds.coordinates[0] as [number, number][])
    : value
      ? ([value.lng, value.lat] as [number, number])
      : DEFAULT_CENTER;

  const initialZoom = parentBounds || value ? 13 : DEFAULT_ZOOM;

  const handlePositionChange = useCallback(
    (pos: { lat: number; lng: number } | null) => {
      setPosition(pos);
      onChange(pos);
    },
    [onChange]
  );

  const handleDragEnd = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      const pos = { lat: lngLat.lat, lng: lngLat.lng };
      if (parentBounds && !pointInsideBounds(pos, parentBounds)) {
        showError('El punto debe estar dentro de los límites del sector');
        // Revert: keep previous position, don't call onChange
        setPosition((prev) => prev);
        return;
      }
      setPosition(pos);
      onChange(pos);
    },
    [onChange, parentBounds, showError]
  );

  const handleClear = useCallback(() => {
    setPosition(null);
    onChange(null);
  }, [onChange]);

  // Sync external value changes
  useEffect(() => {
    setPosition(value ?? null);
  }, [value]);

  const mapStyles = isSatellite
    ? { light: SATELLITE_STYLE, dark: SATELLITE_STYLE }
    : undefined;

  return (
    <div className={className}>
      <div className="relative h-[300px] rounded-md border overflow-hidden">
        <Map
          center={initialCenter}
          zoom={initialZoom}
          styles={mapStyles}
          className="h-full w-full"
        >
          <PointInteraction
            parentBounds={parentBounds}
            position={position}
            onPositionChange={handlePositionChange}
            onError={showError}
            isSatellite={isSatellite}
            recenterTrigger={recenterTrigger}
            siblingPoints={siblingPoints}
          />
          {position && (
            <MapMarker
              longitude={position.lng}
              latitude={position.lat}
              draggable
              onDragEnd={handleDragEnd}
            >
              <MarkerContent>
                <div className="flex items-center justify-center size-8 -translate-x-1/2 -translate-y-full">
                  <MapPin className={`size-8 drop-shadow-md ${isSatellite ? 'text-white fill-white' : 'text-blue-500 fill-blue-500'}`} />
                </div>
              </MarkerContent>
            </MapMarker>
          )}
          <MapControls position="bottom-right" showZoom />
        </Map>

        {/* Top-left controls */}
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
          {position && (
            <Button type="button" variant="secondary" size="sm" onClick={handleClear}>
              <Trash2 className="size-3 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Satellite toggle - top-right */}
        <div className="absolute top-2 right-2 z-10">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-8"
            onClick={() => setIsSatellite((prev) => !prev)}
            title={isSatellite ? 'Vista mapa' : 'Vista satelital'}
          >
            <Layers className="size-4" />
          </Button>
        </div>

        {!position && !error && (
          <div className="absolute bottom-2 left-2 z-10 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">
            Haz clic en el mapa para colocar el marcador
          </div>
        )}

        {error && (
          <div className="absolute bottom-2 left-2 z-10 rounded bg-destructive/80 px-2 py-1 text-xs text-destructive-foreground">
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
