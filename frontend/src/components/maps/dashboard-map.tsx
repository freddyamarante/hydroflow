'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Map as MapComponent, MapControls, useMap, MapMarker, MarkerContent, MarkerLabel, MarkerPopup } from '@/components/ui/map';
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
        <div className="relative h-[850px]">
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
// ParentBoundaryLayer — dashed outline for a parent polygon (reusable)
// ---------------------------------------------------------------------------

function ParentBoundaryLayer({ parentId, parentBounds, isSatellite }: {
  parentId: string;
  parentBounds: GeoJSON.Polygon;
  isSatellite: boolean;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!isLoaded || !map) return;

    const sourceId = `${parentId}-bounds-source`;
    const fillId = `${parentId}-bounds-fill`;
    const lineId = `${parentId}-bounds-line`;

    function addLayers() {
      if (!map!.getSource(sourceId)) {
        map!.addSource(sourceId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: parentBounds } });
      }
      if (!map!.getLayer(fillId)) {
        map!.addLayer({ id: fillId, type: 'fill', source: sourceId, paint: { 'fill-color': '#94a3b8', 'fill-opacity': 0.08 } });
      }
      if (!map!.getLayer(lineId)) {
        map!.addLayer({ id: lineId, type: 'line', source: sourceId, paint: { 'line-color': '#94a3b8', 'line-width': 2, 'line-dasharray': [4, 3] } });
      }
    }

    addLayers();
    const onStyleLoad = () => addLayers();
    map.on('style.load', onStyleLoad);

    return () => {
      try {
        map.off('style.load', onStyleLoad);
        if (map.getLayer(lineId)) map.removeLayer(lineId);
        if (map.getLayer(fillId)) map.removeLayer(fillId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch { /* map destroyed */ }
    };
  }, [isLoaded, map, parentBounds]);

  // Satellite paint updates
  useEffect(() => {
    if (!isLoaded || !map) return;
    const fillId = `${parentId}-bounds-fill`;
    const lineId = `${parentId}-bounds-line`;
    try {
      if (map.getLayer(fillId)) map.setPaintProperty(fillId, 'fill-opacity', isSatellite ? 0.2 : 0.08);
      if (map.getLayer(lineId)) {
        map.setPaintProperty(lineId, 'line-color', isSatellite ? '#ffffff' : '#94a3b8');
        map.setPaintProperty(lineId, 'line-width', isSatellite ? 3 : 2);
      }
    } catch { /* layers may not exist yet */ }
  }, [isLoaded, map, isSatellite]);

  return null;
}

// ---------------------------------------------------------------------------
// PointOverlayLayers — parent boundary + markers with labels and hover tooltips
// ---------------------------------------------------------------------------

interface PointChild {
  id: string;
  nombre: string;
  posicion: unknown;
  topicMqtt?: string;
  dispositivoCodigo?: string | null;
  ultimaLectura?: string | null;
  valores?: Record<string, number> | null;
}

export function PointOverlayLayers({ parentId, parentBounds, children: points, isSatellite, onPointClick }: {
  parentId: string;
  parentBounds: GeoJSON.Polygon;
  children: PointChild[];
  isSatellite: boolean;
  onPointClick?: (id: string) => void;
}) {
  const pointsWithPos = points.filter((p) => p.posicion);

  return (
    <>
      <ParentBoundaryLayer parentId={parentId} parentBounds={parentBounds} isSatellite={isSatellite} />
      {pointsWithPos.map((point) => {
        const pos = point.posicion as { lat: number; lng: number };
        return (
          <MapMarker key={point.id} longitude={pos.lng} latitude={pos.lat}>
            <MarkerContent>
              <div className="size-3.5 rounded-full border-2 border-white bg-blue-500 shadow-lg cursor-pointer" />
              <MarkerLabel className={isSatellite ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : ''}>
                {point.nombre}
              </MarkerLabel>
            </MarkerContent>
            <MarkerPopup closeButton>
              <div className="space-y-2 min-w-[180px]">
                <p className="font-semibold text-sm">{point.nombre}</p>
                {point.valores ? (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    {point.valores.velocidad != null && (
                      <><span className="text-muted-foreground">Velocidad</span><span className="font-medium text-right">{point.valores.velocidad} m/s</span></>
                    )}
                    {point.valores.nivel != null && (
                      <><span className="text-muted-foreground">Nivel</span><span className="font-medium text-right">{point.valores.nivel} m</span></>
                    )}
                    {point.valores.flujo_instantaneo != null && (
                      <><span className="text-muted-foreground">Flujo</span><span className="font-medium text-right">{point.valores.flujo_instantaneo} m³/s</span></>
                    )}
                    {point.valores.bomba_encendida != null && (
                      <><span className="text-muted-foreground">Bomba</span><span className={`font-medium text-right ${point.valores.bomba_encendida ? 'text-green-500' : 'text-red-500'}`}>{point.valores.bomba_encendida ? 'Encendida' : 'Apagada'}</span></>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">Sin lecturas</p>
                )}
                {point.ultimaLectura && (
                  <p className="text-muted-foreground text-[10px]">{new Date(point.ultimaLectura).toLocaleString('es-EC')}</p>
                )}
                <button
                  type="button"
                  className="w-full rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  onClick={() => onPointClick?.(point.id)}
                >
                  Ver detalles
                </button>
              </div>
            </MarkerPopup>
          </MapMarker>
        );
      })}
    </>
  );
}
