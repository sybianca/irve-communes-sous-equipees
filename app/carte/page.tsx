'use client';

import { useEffect, useState, useRef } from 'react';

export default function CartePage() {
  const [communes, setCommunes] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    async function loadDataAndInit() {
      try {
        // 1. Charger les données
        const response = await fetch('/api/communes');
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || data.hint || 'Erreur de chargement');
        }
        const data = await response.json();
        setCommunes(data);

        // 2. Attendre que Leaflet soit chargé
        // @ts-ignore - L est global après chargement via script tag
        if (typeof window !== 'undefined' && typeof (window as any).L === 'undefined') {
          // Charger Leaflet dynamiquement
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
          });
        }

        // 3. Vérifier que l'élément map existe
        let mapElement = document.getElementById('map');
        let retries = 0;
        const maxRetries = 10;
        
        while (!mapElement && retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 100));
          mapElement = document.getElementById('map');
          retries++;
        }

        if (!mapElement) {
          throw new Error('Map container not found after retrying');
        }

        // 4. Vérifier que L est chargé
        // @ts-ignore
        if (typeof L === 'undefined') {
          throw new Error('Leaflet not loaded');
        }

        // 5. Initialiser la carte
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

        geoJsonLayer.addTo(map);
        map.fitBounds(geoJsonLayer.getBounds());

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    }

    // Charger Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    loadDataAndInit();

    return () => {
      if (mapRef.current) {
        // @ts-ignore
        mapRef.current.remove();
      }
    };
  }, []);

  if (loading) return (
    <main style={{ width: '100%', height: '100vh', padding: 0, margin: 0 }}>
      <div style={{ padding: '10px', background: 'white' }}>
        <h1 style={{ margin: 0 }}>Carte des communes - EVChargeSync</h1>
        <p>Chargement en cours...</p>
      </div>
    </main>
  );
  if (error) return (
    <main style={{ width: '100%', height: '100vh', padding: 0, margin: 0 }}>
      <div style={{ padding: '10px', background: 'white' }}>
        <h1 style={{ margin: 0, color: 'red' }}>Erreur</h1>
        <p>{error}</p>
      </div>
    </main>
  );

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
