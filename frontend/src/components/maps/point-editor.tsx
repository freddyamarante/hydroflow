'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Map, MapControls, MapMarker, MarkerContent, useMap } from '@/components/ui/map';
import { Button } from '@/components/ui/button';
import { Trash2, MapPin } from 'lucide-react';
import type MapLibreGL from 'maplibre-gl';

interface PointEditorProps {
  value?: { lat: number; lng: number } | null;
  onChange: (pos: { lat: number; lng: number } | null) => void;
  parentBounds?: GeoJSON.Polygon | null;
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [-79.9, -2.2];
const DEFAULT_ZOOM = 10;

function ParentBoundsLayer() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!isLoaded || !map) return;

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

    return () => {
      try {
        if (map.getLayer('parent-bounds-line')) map.removeLayer('parent-bounds-line');
        if (map.getSource('parent-bounds-source')) map.removeSource('parent-bounds-source');
      } catch {
        // ignore
      }
    };
  }, [isLoaded, map]);

  return null;
}

export function PointEditor({ value, onChange, parentBounds, className }: PointEditorProps) {
  const mapRef = useRef<MapLibreGL.Map | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(value ?? null);

  const initialCenter = parentBounds
    ? getCenterOfPolygon(parentBounds.coordinates[0] as [number, number][])
    : value
      ? [value.lng, value.lat] as [number, number]
      : DEFAULT_CENTER;

  const initialZoom = parentBounds || value ? 13 : DEFAULT_ZOOM;

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
      const pos = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      setPosition(pos);
      onChange(pos);
    },
    [onChange]
  );

  const handleDragEnd = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      const pos = { lat: lngLat.lat, lng: lngLat.lng };
      setPosition(pos);
      onChange(pos);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    setPosition(null);
    onChange(null);
  }, [onChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [handleMapClick]);

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

  // Sync external value changes
  useEffect(() => {
    setPosition(value ?? null);
  }, [value]);

  return (
    <div className={className}>
      <div className="relative h-[300px] rounded-md border overflow-hidden">
        <Map
          ref={mapRef as React.Ref<MapLibreGL.Map>}
          center={initialCenter}
          zoom={initialZoom}
          className="h-full w-full"
        >
          <ParentBoundsLayer />
          {position && (
            <MapMarker
              longitude={position.lng}
              latitude={position.lat}
              draggable
              onDragEnd={handleDragEnd}
            >
              <MarkerContent>
                <div className="flex items-center justify-center size-8 -translate-x-1/2 -translate-y-full">
                  <MapPin className="size-8 text-blue-500 fill-blue-500 drop-shadow-md" />
                </div>
              </MarkerContent>
            </MapMarker>
          )}
          <MapControls position="bottom-right" showZoom />
        </Map>
        <div className="absolute top-2 left-2 z-10 flex gap-1">
          {position && (
            <Button type="button" variant="secondary" size="sm" onClick={handleClear}>
              <Trash2 className="size-3 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
        {!position && (
          <div className="absolute bottom-2 left-2 z-10 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">
            Haz clic en el mapa para colocar el marcador
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
