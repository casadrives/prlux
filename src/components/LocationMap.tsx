import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { AlertCircle } from 'lucide-react';

interface Marker {
  coordinates: [number, number];
  type: 'pickup' | 'dropoff' | 'driver';
}

interface LocationMapProps {
  className?: string;
  center?: [number, number];
  markers?: Marker[];
  showRoute?: boolean;
}

export function LocationMap({ className = '', center, markers = [], showRoute = false }: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    const style = import.meta.env.VITE_MAPBOX_STYLE;

    if (!token || !style) {
      console.error('Mapbox token or style not configured');
      return;
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: style,
      center: center || [6.13, 49.61], // Default to Luxembourg City
      zoom: 13,
      attributionControl: false
    });

    map.current.addControl(new mapboxgl.AttributionControl({
      compact: true
    }));

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    markers.forEach(marker => {
      const el = document.createElement('div');
      el.className = 'w-8 h-8 flex items-center justify-center';
      
      switch (marker.type) {
        case 'pickup':
          el.innerHTML = '<div class="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>';
          break;
        case 'dropoff':
          el.innerHTML = '<div class="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>';
          break;
        case 'driver':
          el.innerHTML = '<div class="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center"><svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L19 21l-7-4-7 4 7-19z"/></svg></div>';
          break;
      }

      const newMarker = new mapboxgl.Marker(el)
        .setLngLat(marker.coordinates)
        .addTo(map.current!);

      markersRef.current.push(newMarker);
    });

    if (markers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      markers.forEach(marker => bounds.extend(marker.coordinates));
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [markers]);

  useEffect(() => {
    if (!map.current || !showRoute || markers.length < 2) return;

    const coordinates = markers.map(m => m.coordinates);
    
    const initRoute = () => {
      if (!map.current!.getSource('route')) {
        map.current!.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coordinates
            }
          }
        });

        map.current!.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#4B5563',
            'line-width': 4,
            'line-opacity': 0.75
          }
        });
      } else {
        (map.current!.getSource('route') as mapboxgl.GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          }
        });
      }
    };

    if (map.current.loaded()) {
      initRoute();
    } else {
      map.current.on('load', initRoute);
    }
  }, [markers, showRoute]);

  return (
    <div 
      ref={mapContainer} 
      className={`${className} relative bg-gray-100`}
      style={{ minHeight: '300px' }}
    />
  );
}