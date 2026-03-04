'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Map, MapControls, useMap } from '@/components/ui/map';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type MapLibreGL from 'maplibre-gl';

interface RectangleEditorProps {
  value?: GeoJSON.Polygon | null;
  onChange: (bounds: GeoJSON.Polygon | null) => void;
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [-79.9, -2.2];
const DEFAULT_ZOOM = 10;
const ASPECT_RATIO = 16 / 9;

function getRectangleFromCorners(
  corner1: [number, number],
  corner2: [number, number]
): [number, number][] {
  const west = Math.min(corner1[0], corner2[0]);
  const east = Math.max(corner1[0], corner2[0]);
  const width = east - west;
  const height = width / ASPECT_RATIO;
  const centerLat = (corner1[1] + corner2[1]) / 2;
  const south = centerLat - height / 2;
  const north = centerLat + height / 2;

  return [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ];
}

function RectangleLayer() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!isLoaded || !map) return;

    if (!map.getSource('rectangle-source')) {
      map.addSource('rectangle-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!map.getLayer('rectangle-fill')) {
      map.addLayer({
        id: 'rectangle-fill',
        type: 'fill',
        source: 'rectangle-source',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.15,
        },
      });
    }

    if (!map.getLayer('rectangle-line')) {
      map.addLayer({
        id: 'rectangle-line',
        type: 'line',
        source: 'rectangle-source',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
        },
      });
    }

    return () => {
      try {
        if (map.getLayer('rectangle-line')) map.removeLayer('rectangle-line');
        if (map.getLayer('rectangle-fill')) map.removeLayer('rectangle-fill');
        if (map.getSource('rectangle-source')) map.removeSource('rectangle-source');
      } catch {
        // ignore
      }
    };
  }, [isLoaded, map]);

  return null;
}

export function RectangleEditor({ value, onChange, className }: RectangleEditorProps) {
  const mapRef = useRef<MapLibreGL.Map | null>(null);
  const [corner1, setCorner1] = useState<[number, number] | null>(null);
  const [drawing, setDrawing] = useState(false);

  const initialCenter = value
    ? getCenterOfPolygon(value.coordinates[0] as [number, number][])
    : DEFAULT_CENTER;

  const updateSource = useCallback((coordinates: [number, number][] | null) => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource('rectangle-source') as MapLibreGL.GeoJSONSource | undefined;
    if (!source) return;

    if (!coordinates) {
      source.setData({ type: 'FeatureCollection', features: [] });
    } else {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [coordinates] },
      });
    }
  }, []);

  const handleMapClick = useCallback(
    (e: MapLibreGL.MapMouseEvent) => {
      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      if (!drawing) {
        setCorner1(lngLat);
        setDrawing(true);
      } else if (corner1) {
        const coords = getRectangleFromCorners(corner1, lngLat);
        updateSource(coords);
        onChange({
          type: 'Polygon',
          coordinates: [coords],
        });
        setCorner1(null);
        setDrawing(false);
      }
    },
    [drawing, corner1, onChange, updateSource]
  );

  const handleMouseMove = useCallback(
    (e: MapLibreGL.MapMouseEvent) => {
      if (!drawing || !corner1) return;
      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const coords = getRectangleFromCorners(corner1, lngLat);
      updateSource(coords);
    },
    [drawing, corner1, updateSource]
  );

  const handleClear = useCallback(() => {
    updateSource(null);
    onChange(null);
    setCorner1(null);
    setDrawing(false);
  }, [onChange, updateSource]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.on('click', handleMapClick);
    map.on('mousemove', handleMouseMove);

    return () => {
      map.off('click', handleMapClick);
      map.off('mousemove', handleMouseMove);
    };
  }, [handleMapClick, handleMouseMove]);

  // Show existing value
  useEffect(() => {
    if (value) {
      updateSource(value.coordinates[0] as [number, number][]);
    }
  }, [value, updateSource]);

  return (
    <div className={className}>
      <div className="relative h-[300px] rounded-md border overflow-hidden">
        <Map
          ref={mapRef as React.Ref<MapLibreGL.Map>}
          center={initialCenter}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
        >
          <RectangleLayer />
          <MapControls position="bottom-right" showZoom />
        </Map>
        <div className="absolute top-2 left-2 z-10 flex gap-1">
          {(value || drawing) && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClear}
            >
              <Trash2 className="size-3 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
        {!value && !drawing && (
          <div className="absolute bottom-2 left-2 z-10 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">
            Haz clic para colocar la primera esquina del rectangulo (16:9)
          </div>
        )}
        {drawing && (
          <div className="absolute bottom-2 left-2 z-10 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">
            Haz clic para colocar la segunda esquina
          </div>
        )}
      </div>
    </div>
  );
}

function getCenterOfPolygon(coords: [number, number][]): [number, number] {
  const ring = coords.slice(0, -1);
  const lng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
  const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
  return [lng, lat];
}
