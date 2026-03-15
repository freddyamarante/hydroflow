'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Map, MapControls, useMap } from '@/components/ui/map';
import { Button } from '@/components/ui/button';
import { Trash2, Satellite, Map as MapIcon, LocateFixed } from 'lucide-react';
import { getPolygonBBox } from '@/lib/geo';
import type MapLibreGL from 'maplibre-gl';

interface ChildPolygon {
  id: string;
  nombre: string;
  bounds: GeoJSON.Polygon;
}

interface RectangleEditorProps {
  value?: GeoJSON.Polygon | null;
  onChange: (bounds: GeoJSON.Polygon | null) => void;
  childPolygons?: ChildPolygon[];
  className?: string;
}

const CHILD_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const DEFAULT_CENTER: [number, number] = [-79.9, -2.2];
const DEFAULT_ZOOM = 10;

const SATELLITE_STYLE: MapLibreGL.StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [{ id: 'satellite-layer', type: 'raster', source: 'satellite', minzoom: 0, maxzoom: 22 }],
};

function getRectangleFromCorners(c1: [number, number], c2: [number, number]): [number, number][] {
  const west = Math.min(c1[0], c2[0]);
  const east = Math.max(c1[0], c2[0]);
  const south = Math.min(c1[1], c2[1]);
  const north = Math.max(c1[1], c2[1]);
  return [[west, south], [east, south], [east, north], [west, north], [west, south]];
}

function getCenterOfPolygon(coords: [number, number][]): [number, number] {
  const ring = coords.slice(0, -1);
  return [ring.reduce((s, c) => s + c[0], 0) / ring.length, ring.reduce((s, c) => s + c[1], 0) / ring.length];
}

function getBoundsExtent(polygon: GeoJSON.Polygon): { west: number; south: number; east: number; north: number } {
  const coords = polygon.coordinates[0] as [number, number][];
  const lngs = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  return { west: Math.min(...lngs), east: Math.max(...lngs), south: Math.min(...lats), north: Math.max(...lats) };
}

function makePolygonFromExtent(west: number, south: number, east: number, north: number): GeoJSON.Polygon {
  return { type: 'Polygon', coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] };
}

// Handle positions: 4 corners + 4 edge midpoints
type HandleId = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w';

function getHandlePositions(ext: { west: number; south: number; east: number; north: number }): Record<HandleId, [number, number]> {
  const midLng = (ext.west + ext.east) / 2;
  const midLat = (ext.south + ext.north) / 2;
  return {
    nw: [ext.west, ext.north], n: [midLng, ext.north], ne: [ext.east, ext.north],
    w: [ext.west, midLat], e: [ext.east, midLat],
    sw: [ext.west, ext.south], s: [midLng, ext.south], se: [ext.east, ext.south],
  };
}

const HANDLE_CURSORS: Record<HandleId, string> = {
  nw: 'nwse-resize', ne: 'nesw-resize', se: 'nwse-resize', sw: 'nesw-resize',
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
};

// ---------------------------------------------------------------------------
// RectangleInteraction — draw mode (no value) or resize mode (has value)
// ---------------------------------------------------------------------------

function RectangleInteraction({
  value, onChange, drawing, setDrawing, corner1, setCorner1,
  childPolygons, isSatellite, recenterTrigger,
}: {
  value?: GeoJSON.Polygon | null;
  onChange: (bounds: GeoJSON.Polygon | null) => void;
  drawing: boolean;
  setDrawing: (d: boolean) => void;
  corner1: [number, number] | null;
  setCorner1: (c: [number, number] | null) => void;
  childPolygons?: ChildPolygon[];
  isSatellite: boolean;
  recenterTrigger: number;
}) {
  const { map, isLoaded } = useMap();
  const drawingRef = useRef(drawing);
  const corner1Ref = useRef(corner1);
  drawingRef.current = drawing;
  corner1Ref.current = corner1;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const dragHandleRef = useRef<HandleId | null>(null);
  const dragExtentRef = useRef<{ west: number; south: number; east: number; north: number } | null>(null);
  const initialFitRef = useRef(false);

  const setRectangleData = useCallback((coords: [number, number][] | null) => {
    if (!map) return;
    const source = map.getSource('rectangle-source') as MapLibreGL.GeoJSONSource | undefined;
    if (!source) return;
    if (!coords) {
      source.setData({ type: 'FeatureCollection', features: [] });
    } else {
      source.setData({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } });
    }
  }, [map]);

  const setHandlesData = useCallback((ext: { west: number; south: number; east: number; north: number } | null) => {
    if (!map) return;
    const source = map.getSource('handles-source') as MapLibreGL.GeoJSONSource | undefined;
    if (!source) return;
    if (!ext) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }
    const positions = getHandlePositions(ext);
    const features = (Object.entries(positions) as [HandleId, [number, number]][]).map(([id, pos]) => ({
      type: 'Feature' as const,
      properties: { id },
      geometry: { type: 'Point' as const, coordinates: pos },
    }));
    source.setData({ type: 'FeatureCollection', features });
  }, [map]);

  // Add sources and layers
  useEffect(() => {
    if (!isLoaded || !map) return;

    function addLayers() {
      if (!map!.getSource('rectangle-source')) {
        map!.addSource('rectangle-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      }
      if (!map!.getLayer('rectangle-fill')) {
        map!.addLayer({ id: 'rectangle-fill', type: 'fill', source: 'rectangle-source', paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.15 } });
      }
      if (!map!.getLayer('rectangle-line')) {
        map!.addLayer({ id: 'rectangle-line', type: 'line', source: 'rectangle-source', paint: { 'line-color': '#3b82f6', 'line-width': 2 } });
      }
      // Handle points
      if (!map!.getSource('handles-source')) {
        map!.addSource('handles-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      }
      if (!map!.getLayer('handles-layer')) {
        map!.addLayer({
          id: 'handles-layer', type: 'circle', source: 'handles-source',
          paint: { 'circle-radius': 6, 'circle-color': '#ffffff', 'circle-stroke-color': '#3b82f6', 'circle-stroke-width': 2 },
        });
      }

      // Child polygons
      if (childPolygons) {
        for (let i = 0; i < childPolygons.length; i++) {
          const child = childPolygons[i];
          const color = CHILD_COLORS[i % CHILD_COLORS.length];
          const srcId = `child-${child.id}-source`;
          if (!map!.getSource(srcId)) map!.addSource(srcId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: child.bounds } });
          if (!map!.getLayer(`child-${child.id}-fill`)) map!.addLayer({ id: `child-${child.id}-fill`, type: 'fill', source: srcId, paint: { 'fill-color': color, 'fill-opacity': isSatellite ? 0.3 : 0.15 } });
          if (!map!.getLayer(`child-${child.id}-line`)) map!.addLayer({ id: `child-${child.id}-line`, type: 'line', source: srcId, paint: { 'line-color': color, 'line-width': isSatellite ? 3 : 2 } });
          if (!map!.getLayer(`child-${child.id}-label`)) map!.addLayer({ id: `child-${child.id}-label`, type: 'symbol', source: srcId, layout: { 'text-field': child.nombre, 'text-size': 12, 'text-anchor': 'center' }, paint: { 'text-color': color, 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 } });
        }
      }
    }

    addLayers();
    const onStyleLoad = () => addLayers();
    map.on('style.load', onStyleLoad);

    return () => {
      try {
        map.off('style.load', onStyleLoad);
        if (childPolygons) {
          for (const child of childPolygons) {
            [`child-${child.id}-label`, `child-${child.id}-line`, `child-${child.id}-fill`].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
            if (map.getSource(`child-${child.id}-source`)) map.removeSource(`child-${child.id}-source`);
          }
        }
        if (map.getLayer('handles-layer')) map.removeLayer('handles-layer');
        if (map.getSource('handles-source')) map.removeSource('handles-source');
        if (map.getLayer('rectangle-line')) map.removeLayer('rectangle-line');
        if (map.getLayer('rectangle-fill')) map.removeLayer('rectangle-fill');
        if (map.getSource('rectangle-source')) map.removeSource('rectangle-source');
      } catch { /* */ }
    };
  }, [isLoaded, map, childPolygons, isSatellite]);

  // Show value + handles when value changes, fit on initial load
  useEffect(() => {
    if (!isLoaded || !map) return;
    if (value) {
      setRectangleData(value.coordinates[0] as [number, number][]);
      setHandlesData(getBoundsExtent(value));
      if (!initialFitRef.current) {
        initialFitRef.current = true;
        map.fitBounds(getPolygonBBox(value, 0.3), { padding: 40, duration: 0 });
      }
    } else {
      setRectangleData(null);
      setHandlesData(null);
    }
  }, [value, isLoaded, map, setRectangleData, setHandlesData]);

  // Draw mode: click to place corners (only when no value)
  useEffect(() => {
    if (!isLoaded || !map || value) return;

    let mouseDownPos: { x: number; y: number } | null = null;

    const onMouseDown = (e: MapLibreGL.MapMouseEvent) => {
      mouseDownPos = { x: e.point.x, y: e.point.y };
    };

    const handleClick = (e: MapLibreGL.MapMouseEvent) => {
      if (mouseDownPos) {
        const dx = e.point.x - mouseDownPos.x;
        const dy = e.point.y - mouseDownPos.y;
        if (Math.sqrt(dx * dx + dy * dy) > 5) return;
      }
      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      if (!drawingRef.current) {
        setCorner1(lngLat);
        setDrawing(true);
      } else if (corner1Ref.current) {
        const coords = getRectangleFromCorners(corner1Ref.current, lngLat);
        setRectangleData(coords);
        onChangeRef.current({ type: 'Polygon', coordinates: [coords] });
        setCorner1(null);
        setDrawing(false);
      }
    };

    const handleMouseMove = (e: MapLibreGL.MapMouseEvent) => {
      if (!drawingRef.current || !corner1Ref.current) return;
      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setRectangleData(getRectangleFromCorners(corner1Ref.current, lngLat));
    };

    map.getCanvas().style.cursor = 'crosshair';
    map.on('mousedown', onMouseDown);
    map.on('click', handleClick);
    map.on('mousemove', handleMouseMove);

    return () => {
      try {
        map.getCanvas().style.cursor = '';
        map.off('mousedown', onMouseDown);
        map.off('click', handleClick);
        map.off('mousemove', handleMouseMove);
      } catch { /* */ }
    };
  }, [isLoaded, map, value, setCorner1, setDrawing, setRectangleData]);

  // Resize mode: drag handles (only when value exists)
  useEffect(() => {
    if (!isLoaded || !map || !value) return;

    const onHandleEnter = () => {
      if (!dragHandleRef.current) {
        // Detect which handle via query
        map.getCanvas().style.cursor = 'grab';
      }
    };
    const onHandleLeave = () => {
      if (!dragHandleRef.current) {
        map.getCanvas().style.cursor = '';
      }
    };

    const onMouseDown = (e: MapLibreGL.MapLayerMouseEvent) => {
      const handleId = e.features?.[0]?.properties?.id as HandleId | undefined;
      if (!handleId) return;
      e.preventDefault();
      dragHandleRef.current = handleId;
      dragExtentRef.current = getBoundsExtent(value);
      map.getCanvas().style.cursor = HANDLE_CURSORS[handleId];
      map.dragPan.disable();
    };

    const onMouseMove = (e: MapLibreGL.MapMouseEvent) => {
      if (!dragHandleRef.current || !dragExtentRef.current) return;
      const { lng, lat } = e.lngLat;
      const ext = { ...dragExtentRef.current };
      const h = dragHandleRef.current;

      // Update extent based on which handle is being dragged
      if (h === 'nw' || h === 'w' || h === 'sw') ext.west = Math.min(lng, ext.east - 0.0001);
      if (h === 'ne' || h === 'e' || h === 'se') ext.east = Math.max(lng, ext.west + 0.0001);
      if (h === 'nw' || h === 'n' || h === 'ne') ext.north = Math.max(lat, ext.south + 0.0001);
      if (h === 'sw' || h === 's' || h === 'se') ext.south = Math.min(lat, ext.north - 0.0001);

      dragExtentRef.current = ext;
      const poly = makePolygonFromExtent(ext.west, ext.south, ext.east, ext.north);
      setRectangleData(poly.coordinates[0] as [number, number][]);
      setHandlesData(ext);
    };

    const onMouseUp = () => {
      if (!dragHandleRef.current || !dragExtentRef.current) return;
      const ext = dragExtentRef.current;
      const poly = makePolygonFromExtent(ext.west, ext.south, ext.east, ext.north);
      onChangeRef.current(poly);
      dragHandleRef.current = null;
      dragExtentRef.current = null;
      map.getCanvas().style.cursor = '';
      map.dragPan.enable();
    };

    map.on('mouseenter', 'handles-layer', onHandleEnter);
    map.on('mouseleave', 'handles-layer', onHandleLeave);
    map.on('mousedown', 'handles-layer', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);

    return () => {
      try {
        map.off('mouseenter', 'handles-layer', onHandleEnter);
        map.off('mouseleave', 'handles-layer', onHandleLeave);
        map.off('mousedown', 'handles-layer', onMouseDown);
        map.off('mousemove', onMouseMove);
        map.off('mouseup', onMouseUp);
        map.dragPan.enable();
        map.getCanvas().style.cursor = '';
      } catch { /* */ }
    };
  }, [isLoaded, map, value, setRectangleData, setHandlesData]);

  // Satellite paint adjustments
  useEffect(() => {
    if (!isLoaded || !map) return;
    try {
      if (map.getLayer('rectangle-fill')) map.setPaintProperty('rectangle-fill', 'fill-opacity', isSatellite ? 0.35 : 0.15);
      if (map.getLayer('rectangle-line')) {
        map.setPaintProperty('rectangle-line', 'line-color', isSatellite ? '#93c5fd' : '#3b82f6');
        map.setPaintProperty('rectangle-line', 'line-width', isSatellite ? 3 : 2);
      }
      if (map.getLayer('handles-layer')) {
        map.setPaintProperty('handles-layer', 'circle-stroke-color', isSatellite ? '#93c5fd' : '#3b82f6');
      }
    } catch { /* */ }
  }, [isLoaded, map, isSatellite]);

  // Recenter
  useEffect(() => {
    if (!isLoaded || !map || !value || recenterTrigger === 0) return;
    map.fitBounds(getPolygonBBox(value, 0), { padding: 40, duration: 300 });
  }, [isLoaded, map, value, recenterTrigger]);

  return null;
}

// ---------------------------------------------------------------------------
// RectangleEditor — public component
// ---------------------------------------------------------------------------

export function RectangleEditor({ value, onChange, childPolygons, className }: RectangleEditorProps) {
  const [corner1, setCorner1] = useState<[number, number] | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [isSatellite, setIsSatellite] = useState(true);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  const initialCenter = value
    ? getCenterOfPolygon(value.coordinates[0] as [number, number][])
    : DEFAULT_CENTER;

  const handleClear = useCallback(() => {
    onChange(null);
    setCorner1(null);
    setDrawing(false);
  }, [onChange]);

  return (
    <div className={className}>
      <div className="relative h-[300px] rounded-md border overflow-hidden">
        <Map
          center={initialCenter}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          styles={isSatellite ? { light: SATELLITE_STYLE, dark: SATELLITE_STYLE } : undefined}
        >
          <RectangleInteraction
            value={value}
            onChange={onChange}
            drawing={drawing}
            setDrawing={setDrawing}
            corner1={corner1}
            setCorner1={setCorner1}
            childPolygons={childPolygons}
            isSatellite={isSatellite}
            recenterTrigger={recenterTrigger}
          />
          <MapControls position="bottom-right" showZoom />
        </Map>
        <div className="absolute top-2 left-2 z-10 flex gap-1">
          {value && (
            <Button type="button" variant="secondary" size="icon" className="size-8 shadow-md" onClick={() => setRecenterTrigger(n => n + 1)} title="Centrar en el rectangulo">
              <LocateFixed className="size-4" />
            </Button>
          )}
          {(value || drawing) && (
            <Button type="button" variant="secondary" size="sm" onClick={handleClear}>
              <Trash2 className="size-3 mr-1" />Limpiar
            </Button>
          )}
        </div>
        <div className="absolute top-2 right-2 z-10">
          <Button type="button" variant="secondary" size="sm" onClick={() => setIsSatellite(p => !p)} className="shadow-md" title={isSatellite ? 'Vista de mapa' : 'Vista satelital'}>
            {isSatellite ? <MapIcon className="size-3 mr-1" /> : <Satellite className="size-3 mr-1" />}
            {isSatellite ? 'Mapa' : 'Satelite'}
          </Button>
        </div>
        {!value && !drawing && (
          <div className="absolute bottom-2 left-2 z-10 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">
            Haz clic para colocar la primera esquina
          </div>
        )}
        {drawing && (
          <div className="absolute bottom-2 left-2 z-10 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">
            Haz clic para colocar la segunda esquina
          </div>
        )}
        {value && !drawing && (
          <div className="absolute bottom-2 left-2 z-10 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">
            Arrastra los puntos para redimensionar
          </div>
        )}
      </div>
    </div>
  );
}
