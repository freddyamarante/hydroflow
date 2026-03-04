'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Map, MapControls, useMap } from '@/components/ui/map';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type MapLibreGL from 'maplibre-gl';

interface BoundsEditorProps {
  value?: GeoJSON.Polygon | null;
  onChange: (bounds: GeoJSON.Polygon | null) => void;
  parentBounds?: GeoJSON.Polygon | null;
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [-79.9, -2.2];
const DEFAULT_ZOOM = 10;

function PolygonLayers() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!isLoaded || !map) return;

    // Parent bounds layer (dashed outline)
    if (!map.getSource('parent-bounds-source')) {
      map.addSource('parent-bounds-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }
    if (!map.getLayer('parent-bounds-line')) {
      map.addLayer({
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

    // Drawing polygon layer
    if (!map.getSource('polygon-source')) {
      map.addSource('polygon-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }
    if (!map.getLayer('polygon-fill')) {
      map.addLayer({
        id: 'polygon-fill',
        type: 'fill',
        source: 'polygon-source',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.15,
        },
      });
    }
    if (!map.getLayer('polygon-line')) {
      map.addLayer({
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
    if (!map.getSource('vertices-source')) {
      map.addSource('vertices-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }
    if (!map.getLayer('vertices-layer')) {
      map.addLayer({
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

    return () => {
      try {
        if (map.getLayer('vertices-layer')) map.removeLayer('vertices-layer');
        if (map.getSource('vertices-source')) map.removeSource('vertices-source');
        if (map.getLayer('polygon-line')) map.removeLayer('polygon-line');
        if (map.getLayer('polygon-fill')) map.removeLayer('polygon-fill');
        if (map.getSource('polygon-source')) map.removeSource('polygon-source');
        if (map.getLayer('parent-bounds-line')) map.removeLayer('parent-bounds-line');
        if (map.getSource('parent-bounds-source')) map.removeSource('parent-bounds-source');
      } catch {
        // ignore
      }
    };
  }, [isLoaded, map]);

  return null;
}

export function BoundsEditor({ value, onChange, parentBounds, className }: BoundsEditorProps) {
  const mapRef = useRef<MapLibreGL.Map | null>(null);
  const [vertices, setVertices] = useState<[number, number][]>([]);
  const [closed, setClosed] = useState(false);

  const initialCenter = parentBounds
    ? getCenterOfPolygon(parentBounds.coordinates[0] as [number, number][])
    : value
      ? getCenterOfPolygon(value.coordinates[0] as [number, number][])
      : DEFAULT_CENTER;

  const initialZoom = parentBounds || value ? 13 : DEFAULT_ZOOM;

  const updatePolygonSource = useCallback((coords: [number, number][], isClosed: boolean) => {
    const map = mapRef.current;
    if (!map) return;

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
  }, []);

  const updateParentSource = useCallback((bounds: GeoJSON.Polygon | null) => {
    const map = mapRef.current;
    if (!map) return;
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
  }, []);

  const handleMapClick = useCallback(
    (e: MapLibreGL.MapMouseEvent) => {
      if (closed) return;
      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setVertices((prev) => {
        const next = [...prev, lngLat];
        updatePolygonSource(next, false);
        return next;
      });
    },
    [closed, updatePolygonSource]
  );

  const handleClose = useCallback(() => {
    if (vertices.length < 3) return;
    setClosed(true);
    const ring = [...vertices, vertices[0]];
    updatePolygonSource(vertices, true);
    onChange({ type: 'Polygon', coordinates: [ring] });
  }, [vertices, onChange, updatePolygonSource]);

  const handleClear = useCallback(() => {
    setVertices([]);
    setClosed(false);
    updatePolygonSource([], false);
    onChange(null);
  }, [onChange, updatePolygonSource]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [handleMapClick]);

  // Show existing value
  useEffect(() => {
    if (value) {
      const ring = value.coordinates[0] as [number, number][];
      const verts = ring.slice(0, -1);
      setVertices(verts);
      setClosed(true);
      updatePolygonSource(verts, true);
    }
  }, [value, updatePolygonSource]);

  // Show parent bounds
  useEffect(() => {
    updateParentSource(parentBounds ?? null);
  }, [parentBounds, updateParentSource]);

  // Fit to parent bounds on mount
  useEffect(() => {
    if (!parentBounds) return;
    const map = mapRef.current;
    if (!map) return;

    const handleLoad = () => {
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
    };

    if (map.loaded()) {
      handleLoad();
    } else {
      map.on('load', handleLoad);
      return () => {
        map.off('load', handleLoad);
      };
    }
  }, [parentBounds]);

  return (
    <div className={className}>
      <div className="relative h-[300px] rounded-md border overflow-hidden">
        <Map
          ref={mapRef as React.Ref<MapLibreGL.Map>}
          center={initialCenter}
          zoom={initialZoom}
          className="h-full w-full"
        >
          <PolygonLayers />
          <MapControls position="bottom-right" showZoom />
        </Map>
        <div className="absolute top-2 left-2 z-10 flex gap-1">
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
