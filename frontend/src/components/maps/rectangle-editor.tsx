'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Map, MapControls, useMap } from '@/components/ui/map';
import { Button } from '@/components/ui/button';
import { Trash2, Satellite, Map as MapIcon, LocateFixed } from 'lucide-react';
import { getPolygonBBox } from '@/lib/geo';
import type MapLibreGL from 'maplibre-gl';

interface RectangleEditorProps {
  value?: GeoJSON.Polygon | null;
  onChange: (bounds: GeoJSON.Polygon | null) => void;
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [-79.9, -2.2];
const DEFAULT_ZOOM = 10;
const ASPECT_RATIO = 16 / 9;

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

function getCenterOfPolygon(coords: [number, number][]): [number, number] {
  const ring = coords.slice(0, -1);
  const lng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
  const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
  return [lng, lat];
}

interface RectangleInteractionProps {
  value?: GeoJSON.Polygon | null;
  onChange: (bounds: GeoJSON.Polygon | null) => void;
  drawing: boolean;
  setDrawing: (d: boolean) => void;
  corner1: [number, number] | null;
  setCorner1: (c: [number, number] | null) => void;
  isSatellite: boolean;
  recenterTrigger: number;
}

function RectangleInteraction({
  value,
  onChange,
  drawing,
  setDrawing,
  corner1,
  setCorner1,
  isSatellite,
  recenterTrigger,
}: RectangleInteractionProps) {
  const { map, isLoaded } = useMap();

  // Use refs for mutable state so event handlers always see the latest values
  const drawingRef = useRef(drawing);
  const corner1Ref = useRef(corner1);
  drawingRef.current = drawing;
  corner1Ref.current = corner1;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const updateSource = useCallback(
    (coordinates: [number, number][] | null) => {
      if (!map) return;
      const source = map.getSource('rectangle-source') as
        | MapLibreGL.GeoJSONSource
        | undefined;
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
    },
    [map]
  );

  // Add source and layers once the map is loaded
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
        if (map.getSource('rectangle-source'))
          map.removeSource('rectangle-source');
      } catch {
        // ignore
      }
    };
  }, [isLoaded, map]);

  // Re-add source/layers after a style change (setStyle removes them)
  useEffect(() => {
    if (!map) return;

    const handleStyleData = () => {
      // Re-add source and layers if they were removed by a style change
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
    };

    map.on('styledata', handleStyleData);
    return () => {
      map.off('styledata', handleStyleData);
    };
  }, [map]);

  // Attach click and mousemove handlers
  useEffect(() => {
    if (!isLoaded || !map) return;

    const handleClick = (e: MapLibreGL.MapMouseEvent) => {
      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      if (!drawingRef.current) {
        setCorner1(lngLat);
        setDrawing(true);
      } else if (corner1Ref.current) {
        const coords = getRectangleFromCorners(corner1Ref.current, lngLat);

        // Update source directly
        const source = map.getSource('rectangle-source') as
          | MapLibreGL.GeoJSONSource
          | undefined;
        if (source) {
          source.setData({
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates: [coords] },
          });
        }

        onChangeRef.current({
          type: 'Polygon',
          coordinates: [coords],
        });
        setCorner1(null);
        setDrawing(false);
      }
    };

    const handleMouseMove = (e: MapLibreGL.MapMouseEvent) => {
      if (!drawingRef.current || !corner1Ref.current) return;
      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const coords = getRectangleFromCorners(corner1Ref.current, lngLat);

      const source = map.getSource('rectangle-source') as
        | MapLibreGL.GeoJSONSource
        | undefined;
      if (source) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [coords] },
        });
      }
    };

    map.on('click', handleClick);
    map.on('mousemove', handleMouseMove);

    return () => {
      map.off('click', handleClick);
      map.off('mousemove', handleMouseMove);
    };
  }, [isLoaded, map, setCorner1, setDrawing]);

  // Show existing value when it changes
  useEffect(() => {
    if (!isLoaded || !map) return;
    if (value) {
      updateSource(value.coordinates[0] as [number, number][]);
    }
  }, [value, updateSource, isLoaded, map]);

  // Adjust paint properties for satellite contrast
  useEffect(() => {
    if (!isLoaded || !map) return;
    try {
      if (map.getLayer('rectangle-fill')) {
        map.setPaintProperty('rectangle-fill', 'fill-opacity', isSatellite ? 0.35 : 0.15);
      }
      if (map.getLayer('rectangle-line')) {
        map.setPaintProperty('rectangle-line', 'line-color', isSatellite ? '#93c5fd' : '#3b82f6');
        map.setPaintProperty('rectangle-line', 'line-width', isSatellite ? 3 : 2);
      }
    } catch {
      // layers may not exist yet
    }
  }, [isLoaded, map, isSatellite]);

  // Recenter to drawn rectangle on trigger
  useEffect(() => {
    if (!isLoaded || !map || !value || recenterTrigger === 0) return;
    const bbox = getPolygonBBox(value, 0);
    map.fitBounds(bbox, { padding: 40, duration: 300 });
  }, [isLoaded, map, value, recenterTrigger]);

  return null;
}

interface StyleToggleProps {
  isSatellite: boolean;
  onToggle: () => void;
}

function StyleToggle({ isSatellite, onToggle }: StyleToggleProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={onToggle}
      className="shadow-md"
      title={isSatellite ? 'Vista de mapa' : 'Vista satelital'}
    >
      {isSatellite ? (
        <MapIcon className="size-3 mr-1" />
      ) : (
        <Satellite className="size-3 mr-1" />
      )}
      {isSatellite ? 'Mapa' : 'Satelite'}
    </Button>
  );
}

export function RectangleEditor({
  value,
  onChange,
  className,
}: RectangleEditorProps) {
  const [corner1, setCorner1] = useState<[number, number] | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  const initialCenter = value
    ? getCenterOfPolygon(value.coordinates[0] as [number, number][])
    : DEFAULT_CENTER;

  const handleClear = useCallback(() => {
    onChange(null);
    setCorner1(null);
    setDrawing(false);
  }, [onChange]);

  const handleToggleStyle = useCallback(() => {
    setIsSatellite((prev) => !prev);
  }, []);

  return (
    <div className={className}>
      <div className="relative h-[300px] rounded-md border overflow-hidden">
        <Map
          center={initialCenter}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          styles={
            isSatellite
              ? { light: SATELLITE_STYLE, dark: SATELLITE_STYLE }
              : undefined
          }
        >
          <RectangleInteraction
            value={value}
            onChange={onChange}
            drawing={drawing}
            setDrawing={setDrawing}
            corner1={corner1}
            setCorner1={setCorner1}
            isSatellite={isSatellite}
            recenterTrigger={recenterTrigger}
          />
          <MapControls position="bottom-right" showZoom />
        </Map>
        <div className="absolute top-2 left-2 z-10 flex gap-1">
          {value && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-8 shadow-md"
              onClick={() => setRecenterTrigger((n) => n + 1)}
              title="Centrar en el rectangulo"
            >
              <LocateFixed className="size-4" />
            </Button>
          )}
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
        <div className="absolute top-2 right-2 z-10">
          <StyleToggle
            isSatellite={isSatellite}
            onToggle={handleToggleStyle}
          />
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
