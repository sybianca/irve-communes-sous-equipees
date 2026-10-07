'use client';

import { useEffect, useState, useRef } from 'react';

// Charger Leaflet depuis un CDN pour éviter les problèmes SSR
declare const L: typeof import('leaflet');

export default function CartePage() {
  const [communes, setCommunes] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<any>(null);
  const geoJsonLayerRef = useRef<any>(null);

  useEffect(() => {
    // Charger Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Charger Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = initMap;
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  const initMap = async () => {
    // @ts-ignore - L est chargé via CDN
    if (typeof L === 'undefined') {
      setError('Leaflet non chargé');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/communes');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur de chargement');
      }
      const data = await response.json();
      setCommunes(data);

      // Initialiser la carte
      // @ts-ignore
      const map = L.map('map').setView([45.1, 1.9], 10);
      mapRef.current = map;

      // Ajouter une couche de fond OpenStreetMap
      // @ts-ignore
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Créer une couche GeoJSON
      // @ts-ignore
      const geoJsonLayer = L.geoJSON(data as GeoJSON.FeatureCollection, {
        style: (feature: any) => {
          if (!feature) return {};
          const props = feature.properties;
          const pointsPar1000 = props?.points_par_1000_hab;
          
          let color = '#cccccc';
          if (pointsPar1000 !== null && pointsPar1000 !== undefined) {
            if (pointsPar1000 < 0.3) color = '#ff0000';
            else if (pointsPar1000 <= 0.6) color = '#ffa500';
            else color = '#008000';
          }
          
          return {
            fillColor: color,
            fillOpacity: 0.6,
            color: '#333',
            weight: 1,
            opacity: 1,
          };
        },
        onEachFeature: (feature: any, layer: any) => {
          if (!feature) return;
          const props = feature.properties;
          const popupContent = `
            <b>${props.commune || 'N/A'}</b><br>
            Code INSEE: ${props.code_insee || 'N/A'}<br>
            Population: ${props.population || 'N/A'}<br>
            Points/1000 hab: ${props.points_par_1000_hab?.toFixed(2) || 'N/A'}<br>
            Score: ${props.score_equipement?.toFixed(2) || 'N/A'}<br>
            Rang: ${props.rang_sous_equipe || 'N/A'}
          `;
          layer.bindPopup(popupContent);
        },
      });

      geoJsonLayerRef.current = geoJsonLayer;
      geoJsonLayer.addTo(map);
      map.fitBounds(geoJsonLayer.getBounds());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <main><p>Chargement de la carte et des données...</p></main>;
  if (error) return <main><p style={{ color: 'red' }}>{error}</p></main>;

  return (
    <main style={{ width: '100%', height: '100vh', padding: 0, margin: 0 }}>
      <div style={{ padding: '10px', background: 'white', zIndex: 1000, position: 'relative' }}>
        <h1 style={{ margin: 0 }}>Carte des communes - EVChargeSync</h1>
        <p style={{ margin: '5px 0' }}>Visualisation des bornes de recharge par commune (CC Xaintrie Val&#39;Dordogne)</p>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 20, height: 20, background: '#ff0000', border: '1px solid #333' }}></div>
            <span>{'< '}0.3 (Sous-équipé)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 20, height: 20, background: '#ffa500', border: '1px solid #333' }}></div>
            <span>0.3 - 0.6 (À surveiller)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 20, height: 20, background: '#008000', border: '1px solid #333' }}></div>
            <span>{'> '}0.6 (Bien équipé)</span>
          </div>
        </div>
      </div>
      <div id="map" style={{ width: '100%', height: 'calc(100vh - 100px)' }}></div>
    </main>
  );
}
