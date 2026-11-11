"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  RADIUS_OPTIONS,
  JEMBER_MAP_BOUNDS,
  formatRadiusLabel,
  type RadiusFilter,
} from "@/lib/geo";
import {
  X,
  MapPin,
  Navigation,
  CheckCircle2,
  RotateCw,
} from "lucide-react";

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDistrict: string;
  currentRadius: RadiusFilter;
  onApplyLocation: (
    locationName: string,
    radius: RadiusFilter,
    coords?: { lat: number; lng: number }
  ) => void;
}

export default function LocationModal({
  isOpen,
  onClose,
  currentDistrict,
  currentRadius,
  onApplyLocation,
}: LocationModalProps) {
  const resolveRadius = (val: RadiusFilter): RadiusFilter =>
    RADIUS_OPTIONS.includes(val) ? val : 2;

  const [radius, setRadius] = useState<RadiusFilter>(() => resolveRadius(currentRadius));
  const radiusRef = useRef<RadiusFilter>(radius);
  radiusRef.current = radius;

  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  // Default to Jember City Center (Alun-Alun Jember / UNEJ Area)
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: -8.1725,
    lng: 113.7000,
  });
  const [locationName, setLocationName] = useState<string>(currentDistrict || "Jember");
  const [detailAddress, setDetailAddress] = useState<string>("");
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const resolved = resolveRadius(currentRadius);
    radiusRef.current = resolved;
    setRadius(resolved);
  }, [isOpen, currentRadius]);

  // Map DOM and instance refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const circleInstanceRef = useRef<any>(null);

  // Reverse geocode lat,lng to readable address via OSM Nominatim
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "id,en",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const road =
          addr.road ||
          addr.residential ||
          addr.street ||
          addr.pedestrian ||
          addr.path ||
          "";
        const suburb =
          addr.suburb ||
          addr.village ||
          addr.neighbourhood ||
          addr.city_district ||
          addr.quarter ||
          "";
        const city =
          addr.city ||
          addr.town ||
          addr.municipality ||
          addr.county ||
          addr.state_district ||
          "";
        const province = addr.state || "";

        let formattedName = "";
        if (road && suburb) {
          formattedName = `${road}, ${suburb}`;
        } else if (suburb && city) {
          formattedName = `${suburb}, ${city}`;
        } else if (road && city) {
          formattedName = `${road}, ${city}`;
        } else if (city) {
          formattedName = city;
        } else if (suburb) {
          formattedName = suburb;
        } else {
          formattedName = `Lokasi (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        }

        setLocationName(formattedName);
        setDetailAddress(
          data.display_name ||
            (city ? `${city}, ${province}` : `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        );
      } else {
        setLocationName(`Titik Koordinat`);
        setDetailAddress(`Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setLocationName(`Titik Koordinat`);
      setDetailAddress(`Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  };

  const syncCircleToRadius = (
    targetRadius: RadiusFilter,
    centerLat?: number,
    centerLng?: number,
    fitJember = true
  ) => {
    const map = mapInstanceRef.current;
    const circle = circleInstanceRef.current;
    if (!circle) return;

    if (centerLat !== undefined && centerLng !== undefined) {
      circle.setLatLng([centerLat, centerLng]);
    }

    if (targetRadius === "jember") {
      circle.setStyle({ opacity: 0, fillOpacity: 0 });
      if (map && fitJember) {
        map.fitBounds(JEMBER_MAP_BOUNDS, { padding: [18, 18], animate: true });
      }
      return;
    }

    circle.setStyle({ opacity: 1, fillOpacity: 0.15 });
    circle.setRadius(targetRadius * 1000);
    if (map) {
      try {
        map.fitBounds(circle.getBounds(), {
          padding: [45, 45],
          maxZoom: 16,
          animate: true,
        });
      } catch {
        if (centerLat !== undefined && centerLng !== undefined) {
          map.setView([centerLat, centerLng], 14);
        }
      }
    }
  };

  // Move marker & circle to detected position and frame view cleanly
  const updateMapPosition = (
    newLat: number,
    newLng: number,
    newRadius?: RadiusFilter
  ) => {
    const currentRad = newRadius !== undefined ? newRadius : radiusRef.current;
    setCoords({ lat: newLat, lng: newLng });

    const map = mapInstanceRef.current;
    const marker = markerInstanceRef.current;

    if (marker) {
      marker.setLatLng([newLat, newLng]);
    }

    if (map) {
      map.invalidateSize();
    }

    syncCircleToRadius(currentRad, newLat, newLng, false);
  };

  // Browser Geolocation detection
  const detectRealLocation = () => {
    setIsDetecting(true);
    setGpsError(null);

    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracyM = position.coords.accuracy || 0;
          updateMapPosition(lat, lng, radiusRef.current);
          await reverseGeocode(lat, lng);
          if (accuracyM > 3000) {
            setGpsError(
              `Perangkat hanya mendeteksi estimasi jaringan/Wi-Fi (akurasi ±${Math.round(accuracyM / 1000)} km). Geser pin atau klik titik lokasi Anda langsung pada peta bila posisi meleset.`
            );
          }
          setIsDetecting(false);
        },
        (error) => {
          setIsDetecting(false);
          if (error.code === error.PERMISSION_DENIED) {
            setGpsError(
              "Izin akses GPS tidak diizinkan di browser Anda. Silakan geser pin atau klik lokasi Anda langsung pada peta."
            );
          } else {
            setGpsError("Sensor GPS tidak merespons. Silakan geser pin pada peta secara manual.");
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      setIsDetecting(false);
      setGpsError("Browser tidak mendukung geolokasi.");
    }
  };

  // Radius change handler
  const handleRadiusChange = (newRad: RadiusFilter) => {
    radiusRef.current = newRad;
    setRadius(newRad);
    syncCircleToRadius(newRad);
  };

  // Initialize interactive Leaflet map when modal is opened
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const initLeaflet = async () => {
      // Dynamic import to prevent any SSR window undefined errors
      const leafletModule = await import("leaflet");
      const L = leafletModule.default || leafletModule;

      if (!isMounted || !mapContainerRef.current) return;

      // Clean up previous instance if exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Check saved coords from localStorage
      let initialLat = coords.lat;
      let initialLng = coords.lng;
      let hasSavedCoords = false;
      if (typeof window !== "undefined") {
        const savedCoordsStr = localStorage.getItem("trypedia_user_coords");
        if (savedCoordsStr) {
          try {
            const parsed = JSON.parse(savedCoordsStr);
            if (typeof parsed?.lat === "number" && typeof parsed?.lng === "number") {
              initialLat = parsed.lat;
              initialLng = parsed.lng;
              hasSavedCoords = true;
              setCoords({ lat: initialLat, lng: initialLng });
            }
          } catch {
            // Ignore parse error
          }
        }
      }

      // Create Leaflet map instance with zoom controls at TOP RIGHT
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: false, // Turn off default top-left control
        attributionControl: true,
      });
      mapInstanceRef.current = map;

      // Add zoom control (+ and -) strictly at TOP RIGHT
      L.control.zoom({ position: "topright" }).addTo(map);

      // Add metric distance scale bar (km / m) at bottom-left for real visual distance verification
      L.control.scale({ imperial: false, metric: true, position: "bottomleft" }).addTo(map);

      // OpenStreetMap Standard Tiles
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
      }).addTo(map);

      // Clean SVG Marker locked to user's location with drag support
      const customPinIcon = L.divIcon({
        className: "trypedia-map-pin",
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: grab; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35)); pointer-events: auto;">
            <div style="background-color: #03AC0E; color: white; padding: 3px 8px; border-radius: 9999px; font-size: 10.5px; font-weight: 800; white-space: nowrap; margin-bottom: 2px; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.25);">
              📍 Posisi Anda
            </div>
            <svg width="34" height="42" viewBox="0 0 24 24" fill="#03AC0E" stroke="#ffffff" stroke-width="1.8">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3.2" fill="#ffffff"/>
            </svg>
            <div style="width: 12px; height: 5px; background: rgba(0,0,0,0.3); border-radius: 50%; margin-top: -3px; filter: blur(1px);"></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      // Draggable marker locked to user location
      const marker = L.marker([initialLat, initialLng], {
        icon: customPinIcon,
        draggable: true,
      }).addTo(map);
      markerInstanceRef.current = marker;

      const activeRadius = radiusRef.current;
      const circle = L.circle([initialLat, initialLng], {
        radius: typeof activeRadius === "number" ? activeRadius * 1000 : 2000,
        color: "#03AC0E",
        fillColor: "#03AC0E",
        fillOpacity: activeRadius === "jember" ? 0 : 0.15,
        opacity: activeRadius === "jember" ? 0 : 1,
        weight: 2,
      }).addTo(map);
      circleInstanceRef.current = circle;

      // Drag listener so user can drag the pin
      marker.on("dragend", async (e: any) => {
        const pos = e.target.getLatLng();
        updateMapPosition(pos.lat, pos.lng, radiusRef.current);
        await reverseGeocode(pos.lat, pos.lng);
      });

      // Map click listener so user can also click anywhere on map
      map.on("click", async (e: any) => {
        const clickedLat = e.latlng.lat;
        const clickedLng = e.latlng.lng;
        updateMapPosition(clickedLat, clickedLng, radiusRef.current);
        await reverseGeocode(clickedLat, clickedLng);
      });

      // Frame map to selected radius or all Kab. Jember
      syncCircleToRadius(activeRadius, initialLat, initialLng, true);

      // Invalidate map size after modal animation
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 250);

      // Trigger GPS detection only if user has not saved a pinned coordinate yet
      if (!hasSavedCoords) {
        detectRealLocation();
      } else {
        reverseGeocode(initialLat, initialLng);
      }
    };

    initLeaflet();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-gray-100 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="bg-[#F5F7FA] border-b border-gray-200 px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EBF8EE] text-[#03AC0E] flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#03AC0E]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">
                Lokasi Saya & Radius Pencarian COD
              </h3>
              <p className="text-[11px] text-gray-500">
                Peta OpenStreetMap (OSM) berpusat pada posisi GPS Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
          {/* Detected Address Card */}
          <div className="bg-emerald-50/70 border border-[#03AC0E]/30 p-3.5 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#03AC0E] text-white flex items-center justify-center shrink-0">
                <Navigation className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-emerald-950 uppercase tracking-wide block">
                  LOKASI ANDA TERDETEKSI:
                </span>
                <span className="text-xs sm:text-sm font-bold text-gray-900 block truncate">
                  {isDetecting && !locationName
                    ? "Membaca Sinyal GPS..."
                    : locationName || "Menentukan Titik Lokasi..."}
                </span>
                <p className="text-[10.5px] text-gray-500 truncate mt-0.5">
                  {isDetecting && !detailAddress
                    ? "Mengambil koordinat perangkat Anda..."
                    : detailAddress || "Klik 'Deteksi GPS' untuk memperbarui titik lokasi Anda"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={detectRealLocation}
              disabled={isDetecting}
              className="bg-white hover:bg-emerald-100 text-[#03AC0E] border border-[#03AC0E] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Deteksi ulang posisi perangkat via GPS"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isDetecting ? "animate-spin" : ""}`} />
              <span>{isDetecting ? "Membaca..." : "Deteksi GPS"}</span>
            </button>
          </div>

          {gpsError && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg leading-relaxed">
              {gpsError}
            </p>
          )}

          {/* Interactive Leaflet Map Container with Zoom Controls (+ / -) */}
          <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-gray-300 bg-gray-100 shadow-inner">
            {/* Real Interactive Leaflet Map Div */}
            <div
              ref={mapContainerRef}
              className="w-full h-full z-0"
            />

            {/* Radius Badge Overlay */}
            <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-[#03AC0E]/30 shadow-xs flex items-center gap-1.5 z-10 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-[#03AC0E] animate-pulse" />
              <span className="text-[11px] font-bold text-[#03AC0E]">
                {radius === "jember"
                  ? "Cakupan: Seluruh Kab. Jember"
                  : `Radius: ${radius} km dari posisi Anda`}
              </span>
            </div>
          </div>

          {/* Radius Selector: 2 Km, 5 Km, 10 Km, Seluruh Jember */}
          <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <span>Pilih Jarak Radius Pencarian COD:</span>
              </label>
              <span className="text-xs font-black text-[#03AC0E] bg-[#EBF8EE] px-2.5 py-0.5 rounded-full border border-[#03AC0E]/30">
                {formatRadiusLabel(radius)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {RADIUS_OPTIONS.map((opt) => {
                const isSelected = radius === opt;
                return (
                  <button
                    key={String(opt)}
                    type="button"
                    onClick={() => handleRadiusChange(opt)}
                    className={`py-3 px-2 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center ${
                      isSelected
                        ? "border-[#03AC0E] bg-[#03AC0E] text-white shadow-xs"
                        : "border-gray-200 bg-white text-gray-700 hover:border-[#03AC0E]/50 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-extrabold whitespace-nowrap">
                      {formatRadiusLabel(opt)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={() => {
                onApplyLocation(locationName, radius, coords);
                if (typeof window !== "undefined") {
                  localStorage.setItem("trypedia_user_coords", JSON.stringify(coords));
                  localStorage.setItem("trypedia_user_location", locationName);
                  localStorage.setItem("trypedia_user_radius", String(radius));
                }
                onClose();
              }}
              className="flex-2 bg-[#03AC0E] hover:bg-[#02980C] text-white py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Terapkan Lokasi Ini ({formatRadiusLabel(radius)})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
