'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Map as MapComponent, MapControls, useMap } from '@/components/ui/map';
import { Map as MapIcon, Satellite, LocateFixed } from 'lucide-react';
import { getPolygonBBox } from '@/lib/geo';

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

export const SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    satellite: {
      type: 'raster' as const,
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: 'satellite-layer', type: 'raster' as const, source: 'satellite', minzoom: 0, maxzoom: 22 },
  ],
};

export const OVERLAY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

// ---------------------------------------------------------------------------
// MapBoundsController — handles fitBounds, minZoom, maxBounds, recenter
// ---------------------------------------------------------------------------

function MapBoundsController({ bounds, recenterTrigger }: {
  bounds: GeoJSON.Polygon;
  recenterTrigger: number;
}) {
  const { map, isLoaded } = useMap();
  const fittedRef = useRef(false);

  // Initial fit + zoom constraints
  useEffect(() => {
    if (!isLoaded || !map) return;

    // Compute minZoom: fit to bounds + 5% then read the zoom level
    map.setMaxBounds(null);
    const zoomBBox = getPolygonBBox(bounds, 0.05);
    map.fitBounds(zoomBBox, { padding: 20, duration: 0 });
    const minZoom = map.getZoom();
    map.setMinZoom(minZoom);

    // Constrain panning with generous bounds so polygon stays visible but zoom isn't restricted
    map.setMaxBounds(getPolygonBBox(bounds, 1.0));

    // Now fit to tight bounds for the initial view
    if (!fittedRef.current) {
      fittedRef.current = true;
    }
    const bbox = getPolygonBBox(bounds, 0);
    map.fitBounds(bbox, { padding: 40, duration: 0 });

    return () => {
      try { map.setMinZoom(0); map.setMaxBounds(null); } catch { /* map destroyed */ }
    };
  }, [isLoaded, map, bounds]);

  // Recenter
  useEffect(() => {
    if (!isLoaded || !map || recenterTrigger === 0) return;
    map.fitBounds(getPolygonBBox(bounds, 0), { padding: 40, duration: 300 });
  }, [isLoaded, map, bounds, recenterTrigger]);

  return null;
}

// ---------------------------------------------------------------------------
// DashboardMapCard — Card wrapper with satellite toggle, recenter, map
// ---------------------------------------------------------------------------

export function DashboardMapCard({ title, bounds, children }: {
  title: string;
  bounds: GeoJSON.Polygon;
  children: (isSatellite: boolean) => ReactNode;
}) {
  const [isSatellite, setIsSatellite] = useState(true);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <CardHeader className="p-4"><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="relative h-[500px]">
          <div className="absolute top-2 left-2 z-10">
            <Button type="button" variant="secondary" size="icon" className="size-8 shadow-md" onClick={() => setRecenterTrigger((n) => n + 1)} title="Centrar">
              <LocateFixed className="size-4" />
            </Button>
          </div>
          <div className="absolute top-2 right-2 z-10">
            <Button type="button" variant="secondary" size="icon" className="size-8" onClick={() => setIsSatellite((prev) => !prev)} title={isSatellite ? 'Vista mapa' : 'Vista satelital'}>
              {isSatellite ? <MapIcon className="size-4" /> : <Satellite className="size-4" />}
            </Button>
          </div>
          <MapComponent center={[-79.9, -2.2]} zoom={10} className="h-full w-full" styles={isSatellite ? { light: SATELLITE_STYLE, dark: SATELLITE_STYLE } : undefined}>
            <MapBoundsController bounds={bounds} recenterTrigger={recenterTrigger} />
            {children(isSatellite)}
            <MapControls position="bottom-right" showZoom />
          </MapComponent>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// PolygonOverlayLayers — parent boundary + clickable child polygons
// ---------------------------------------------------------------------------

interface PolygonChild {
  id: string;
  nombre: string;
  bounds: unknown;
}

export function PolygonOverlayLayers({ parentId, parentBounds, children: polygons, colors = OVERLAY_COLORS, isSatellite, onChildClick }: {
  parentId: string;
  parentBounds: GeoJSON.Polygon;
  children: PolygonChild[];
  colors?: string[];
  isSatellite: boolean;
  onChildClick?: (id: string) => void;
}) {
  const { map, isLoaded } = useMap();
  const childrenWithBounds = polygons.filter((c) => c.bounds);

  // Add/remove layers
  useEffect(() => {
    if (!isLoaded || !map) return;

    const boundsSourceId = `${parentId}-bounds-source`;
    const boundsFillId = `${parentId}-bounds-fill`;
    const boundsLineId = `${parentId}-bounds-line`;

    function addLayers() {
      if (!map!.getSource(boundsSourceId)) {
        map!.addSource(boundsSourceId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: parentBounds } });
      }
      if (!map!.getLayer(boundsFillId)) {
        map!.addLayer({ id: boundsFillId, type: 'fill', source: boundsSourceId, paint: { 'fill-color': '#94a3b8', 'fill-opacity': 0.08 } });
      }
      if (!map!.getLayer(boundsLineId)) {
        map!.addLayer({ id: boundsLineId, type: 'line', source: boundsSourceId, paint: { 'line-color': '#94a3b8', 'line-width': 2, 'line-dasharray': [4, 3] } });
      }

      childrenWithBounds.forEach((child, idx) => {
        const srcId = `${parentId}-child-${child.id}-source`;
        const fillId = `${parentId}-child-${child.id}-fill`;
        const lineId = `${parentId}-child-${child.id}-line`;
        const labelId = `${parentId}-child-${child.id}-label`;
        const color = colors[idx % colors.length];

        if (!map!.getSource(srcId)) {
          map!.addSource(srcId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: child.bounds as GeoJSON.Polygon } });
        }
        if (!map!.getLayer(fillId)) map!.addLayer({ id: fillId, type: 'fill', source: srcId, paint: { 'fill-color': color, 'fill-opacity': 0.2 } });
        if (!map!.getLayer(lineId)) map!.addLayer({ id: lineId, type: 'line', source: srcId, paint: { 'line-color': color, 'line-width': 2 } });
        if (!map!.getLayer(labelId)) {
          map!.addLayer({ id: labelId, type: 'symbol', source: srcId, layout: { 'text-field': child.nombre, 'text-size': 13, 'text-anchor': 'center', 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'] }, paint: { 'text-color': color, 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 } });
        }
      });
    }

    addLayers();

    // Interaction handlers
    const handlers: Array<{ event: 'click' | 'mouseenter' | 'mouseleave'; layer: string; handler: any }> = [];
    childrenWithBounds.forEach((child, idx) => {
      const fillId = `${parentId}-child-${child.id}-fill`;
      const lineId = `${parentId}-child-${child.id}-line`;
      const color = colors[idx % colors.length];

      if (!map.getLayer(fillId)) return;

      const click = () => onChildClick?.(child.id);
      const enter = () => {
        map.getCanvas().style.cursor = 'pointer';
        if (map.getLayer(fillId)) map.setPaintProperty(fillId, 'fill-opacity', isSatellite ? 0.65 : 0.45);
        if (map.getLayer(lineId)) { map.setPaintProperty(lineId, 'line-width', isSatellite ? 4 : 3); map.setPaintProperty(lineId, 'line-color', color); }
      };
      const leave = () => {
        map.getCanvas().style.cursor = '';
        if (map.getLayer(fillId)) map.setPaintProperty(fillId, 'fill-opacity', isSatellite ? 0.4 : 0.2);
        if (map.getLayer(lineId)) { map.setPaintProperty(lineId, 'line-width', isSatellite ? 3 : 2); map.setPaintProperty(lineId, 'line-color', color); }
      };

      map.on('click', fillId, click);
      map.on('mouseenter', fillId, enter);
      map.on('mouseleave', fillId, leave);
      handlers.push({ event: 'click', layer: fillId, handler: click }, { event: 'mouseenter', layer: fillId, handler: enter }, { event: 'mouseleave', layer: fillId, handler: leave });
    });

    const onStyleLoad = () => addLayers();
    map.on('style.load', onStyleLoad);

    return () => {
      try {
        map.off('style.load', onStyleLoad);
        handlers.forEach(({ event, layer, handler }) => { try { map.off(event, layer, handler); } catch { /* */ } });
        childrenWithBounds.forEach((child) => {
          [`${parentId}-child-${child.id}-label`, `${parentId}-child-${child.id}-line`, `${parentId}-child-${child.id}-fill`].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
          const srcId = `${parentId}-child-${child.id}-source`;
          if (map.getSource(srcId)) map.removeSource(srcId);
        });
        if (map.getLayer(boundsLineId)) map.removeLayer(boundsLineId);
        if (map.getLayer(boundsFillId)) map.removeLayer(boundsFillId);
        if (map.getSource(boundsSourceId)) map.removeSource(boundsSourceId);
      } catch { /* map destroyed */ }
    };
  }, [isLoaded, map, parentBounds, childrenWithBounds.length]);

  // Satellite paint updates
  useEffect(() => {
    if (!isLoaded || !map) return;
    const boundsFillId = `${parentId}-bounds-fill`;
    const boundsLineId = `${parentId}-bounds-line`;
    try {
      if (map.getLayer(boundsFillId)) map.setPaintProperty(boundsFillId, 'fill-opacity', isSatellite ? 0.2 : 0.08);
      if (map.getLayer(boundsLineId)) {
        map.setPaintProperty(boundsLineId, 'line-color', isSatellite ? '#ffffff' : '#94a3b8');
        map.setPaintProperty(boundsLineId, 'line-width', isSatellite ? 3 : 2);
      }
      childrenWithBounds.forEach((child) => {
        const fillId = `${parentId}-child-${child.id}-fill`;
        const lineId = `${parentId}-child-${child.id}-line`;
        const labelId = `${parentId}-child-${child.id}-label`;
        if (map.getLayer(fillId)) map.setPaintProperty(fillId, 'fill-opacity', isSatellite ? 0.4 : 0.2);
        if (map.getLayer(lineId)) map.setPaintProperty(lineId, 'line-width', isSatellite ? 3 : 2);
        if (map.getLayer(labelId)) {
          map.setPaintProperty(labelId, 'text-halo-color', isSatellite ? '#000000' : '#ffffff');
          map.setPaintProperty(labelId, 'text-halo-width', isSatellite ? 2 : 1.5);
        }
      });
    } catch { /* layers may not exist yet */ }
  }, [isLoaded, map, isSatellite, childrenWithBounds.length]);

  return null;
}

// ---------------------------------------------------------------------------
// PointOverlayLayers — parent boundary + clickable point markers
// ---------------------------------------------------------------------------

interface PointChild {
  id: string;
  nombre: string;
  posicion: unknown;
}

const POINT_COLOR = '#3b82f6';

export function PointOverlayLayers({ parentId, parentBounds, children: points, isSatellite, onPointClick }: {
  parentId: string;
  parentBounds: GeoJSON.Polygon;
  children: PointChild[];
  isSatellite: boolean;
  onPointClick?: (id: string) => void;
}) {
  const { map, isLoaded } = useMap();
  const pointsWithPos = points.filter((p) => p.posicion);

  useEffect(() => {
    if (!isLoaded || !map) return;

    const boundsSourceId = `${parentId}-bounds-source`;
    const boundsFillId = `${parentId}-bounds-fill`;
    const boundsLineId = `${parentId}-bounds-line`;
    const pointsSourceId = `${parentId}-points-source`;
    const circlesId = `${parentId}-points-circles`;
    const labelsId = `${parentId}-points-labels`;

    function addLayers() {
      // Parent boundary
      if (!map!.getSource(boundsSourceId)) {
        map!.addSource(boundsSourceId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: parentBounds } });
      }
      if (!map!.getLayer(boundsFillId)) {
        map!.addLayer({ id: boundsFillId, type: 'fill', source: boundsSourceId, paint: { 'fill-color': '#94a3b8', 'fill-opacity': 0.08 } });
      }
      if (!map!.getLayer(boundsLineId)) {
        map!.addLayer({ id: boundsLineId, type: 'line', source: boundsSourceId, paint: { 'line-color': '#94a3b8', 'line-width': 2, 'line-dasharray': [4, 3] } });
      }

      // Point markers
      if (!map!.getSource(pointsSourceId)) {
        const features = pointsWithPos.map((p) => {
          const pos = p.posicion as { lat: number; lng: number };
          return { type: 'Feature' as const, properties: { id: p.id, nombre: p.nombre }, geometry: { type: 'Point' as const, coordinates: [pos.lng, pos.lat] } };
        });
        map!.addSource(pointsSourceId, { type: 'geojson', data: { type: 'FeatureCollection', features } });
      }
      if (!map!.getLayer(circlesId)) {
        map!.addLayer({ id: circlesId, type: 'circle', source: pointsSourceId, paint: { 'circle-radius': 7, 'circle-color': POINT_COLOR, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } });
      }
      if (!map!.getLayer(labelsId)) {
        map!.addLayer({ id: labelsId, type: 'symbol', source: pointsSourceId, layout: { 'text-field': ['get', 'nombre'], 'text-size': 12, 'text-anchor': 'top', 'text-offset': [0, 1], 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'] }, paint: { 'text-color': POINT_COLOR, 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 } });
      }
    }

    addLayers();

    const clickHandler = (e: any) => { const id = e.features?.[0]?.properties?.id; if (id) onPointClick?.(id); };
    const enterHandler = () => { map.getCanvas().style.cursor = 'pointer'; };
    const leaveHandler = () => { map.getCanvas().style.cursor = ''; };

    if (map.getLayer(circlesId)) {
      map.on('click', circlesId, clickHandler);
      map.on('mouseenter', circlesId, enterHandler);
      map.on('mouseleave', circlesId, leaveHandler);
    }

    const onStyleLoad = () => addLayers();
    map.on('style.load', onStyleLoad);

    return () => {
      try {
        map.off('style.load', onStyleLoad);
        if (map.getLayer(circlesId)) {
          map.off('click', circlesId, clickHandler);
          map.off('mouseenter', circlesId, enterHandler);
          map.off('mouseleave', circlesId, leaveHandler);
        }
        [labelsId, circlesId].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
        if (map.getSource(pointsSourceId)) map.removeSource(pointsSourceId);
        if (map.getLayer(boundsLineId)) map.removeLayer(boundsLineId);
        if (map.getLayer(boundsFillId)) map.removeLayer(boundsFillId);
        if (map.getSource(boundsSourceId)) map.removeSource(boundsSourceId);
      } catch { /* map destroyed */ }
    };
  }, [isLoaded, map, parentBounds, pointsWithPos.length]);

  // Satellite paint updates
  useEffect(() => {
    if (!isLoaded || !map) return;
    const boundsFillId = `${parentId}-bounds-fill`;
    const boundsLineId = `${parentId}-bounds-line`;
    const circlesId = `${parentId}-points-circles`;
    const labelsId = `${parentId}-points-labels`;
    try {
      if (map.getLayer(boundsFillId)) map.setPaintProperty(boundsFillId, 'fill-opacity', isSatellite ? 0.2 : 0.08);
      if (map.getLayer(boundsLineId)) {
        map.setPaintProperty(boundsLineId, 'line-color', isSatellite ? '#ffffff' : '#94a3b8');
        map.setPaintProperty(boundsLineId, 'line-width', isSatellite ? 3 : 2);
      }
      if (map.getLayer(circlesId)) map.setPaintProperty(circlesId, 'circle-stroke-color', isSatellite ? '#000000' : '#ffffff');
      if (map.getLayer(labelsId)) {
        map.setPaintProperty(labelsId, 'text-halo-color', isSatellite ? '#000000' : '#ffffff');
        map.setPaintProperty(labelsId, 'text-halo-width', isSatellite ? 2 : 1.5);
      }
    } catch { /* layers may not exist yet */ }
  }, [isLoaded, map, isSatellite]);

  return null;
}
