import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

maplibregl.setWorkerUrl(workerUrl);

export default function HomeMap({ groups, selected, onSelect }) {
  const host = useRef(null);
  const mapRef = useRef(null);
  const selectRef = useRef(onSelect);
  const [failed, setFailed] = useState(false);
  const [tilted, setTilted] = useState(false);
  useEffect(() => { selectRef.current = onSelect; }, [onSelect]);
  useEffect(() => {
    let map;
    let disposed = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      map = new maplibregl.Map({
        container: host.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [106.728, 10.81], zoom: 10.5, pitch: 0,
        attributionControl: { compact: true }, cooperativeGestures: true,
      });
    } catch { setFailed(true); return; }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('load', () => {
      if (disposed) return;
      host.current.dataset.ready = 'true';
      const layer = map.getStyle().layers?.find(item => item.type === 'symbol' && item.layout?.['text-field']);
      if (map.getSource('openmaptiles')) {
        map.addLayer({ id: 'homedorm-buildings', source: 'openmaptiles', 'source-layer': 'building', type: 'fill-extrusion', minzoom: 13, filter: ['!=', ['get', 'hide_3d'], true], paint: { 'fill-extrusion-color': '#d8d6cd', 'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 5], 'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': .7 } }, layer?.id);
      }
    });
    // Keep navigation and room links available if map tiles are offline.
    let timeout = window.setTimeout(() => { if (!disposed && !map.isStyleLoaded()) setFailed(true); }, 18000);
    map.on('load', () => { clearTimeout(timeout); setFailed(false); });
    const markers = [];
    groups.forEach((group, index) => {
      if (!group.center) return;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'hx-map-marker';
      button.textContent = group.area || group.name;
      button.setAttribute('aria-label', `Xem khu vực ${group.name}`);
      button.addEventListener('click', () => selectRef.current(index));
      markers.push(new maplibregl.Marker({ element: button }).setLngLat(group.center).addTo(map));
    });
    const points = groups.filter(group => group.center);
    if (points.length) {
      const bounds = new maplibregl.LngLatBounds(); points.forEach(group => bounds.extend(group.center));
      map.fitBounds(bounds, { padding: 75, maxZoom: 12, duration: reduced ? 0 : 900 });
    }
    const resizeObserver = new ResizeObserver(() => map.resize()); resizeObserver.observe(host.current);
    return () => { disposed = true; clearTimeout(timeout); resizeObserver.disconnect(); markers.forEach(marker => marker.remove()); map.remove(); mapRef.current = null; };
  }, [groups.map(group => group.name + group.center).join('|')]);
  useEffect(() => {
    const group = groups[selected];
    if (group?.center && mapRef.current) mapRef.current.flyTo({ center: group.center, zoom: 13, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 950, essential: false });
  }, [selected, groups.map(group => group.name).join('|')]);
  function toggle3D() {
    setTilted(value => !value);
    mapRef.current?.easeTo({ pitch: tilted ? 0 : 55, bearing: tilted ? 0 : -18, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 800 });
  }
  return <><div className="hx-live-map" ref={host} aria-label="Bản đồ các khu vực chi nhánh" />
    <button className="hx-map-3d" type="button" aria-label="Chuyển bản đồ 3D" aria-pressed={tilted} onClick={toggle3D}>{tilted ? '2D' : '3D'}</button>
    {failed && <div className="hx-map-error">Bản đồ chưa tải được. Bạn vẫn có thể chọn chi nhánh trong danh sách để xem phòng.</div>}
  </>;
}
