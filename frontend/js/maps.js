/**
 * LocalFix Map Engine
 * Powered by Leaflet, OpenStreetMap, CartoDB, and reverse geocoding
 */

const LocalFixMap = (() => {
  const DEFAULT_CENTER = [30.9010, 75.8573]; // Ludhiana, Punjab
  const DEFAULT_ZOOM   = 13;

  /**
   * Initialize a worker discovery map with pins
   */
  const initSearchMap = (containerId, workers = [], onMarkerClick = null) => {
    const el = document.getElementById(containerId);
    if (!el || typeof L === "undefined") return null;
    const pathPrefix = window.location.pathname.includes("/pages/") ? "" : "pages/";

    if (el._leaflet_id) {
      el._leaflet_map?.remove();
    }

    const map = L.map(containerId, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    el._leaflet_map = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 19,
    }).addTo(map);

    const markers = [];
    workers.forEach((w) => {
      if (!w.lat || !w.lng) return;

      const icon = L.divIcon({
        className: "lf-custom-pin",
        html: `
          <div class="lf-map-marker">
            <div class="lf-marker-bubble">
              <span class="lf-marker-price">&#8377;${w.price}</span>
            </div>
            <div class="lf-marker-dot"></div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 42],
        popupAnchor: [0, -38],
      });

      const marker = L.marker([w.lat, w.lng], { icon }).addTo(map);

      const ratingText = w.rating !== null ? `<strong>${w.rating}&#9733;</strong> (${w.reviewsCount})` : `<span class="text-muted">No ratings yet</span>`;
      const surcharge = window.Storage.getDistanceSurcharge ? window.Storage.getDistanceSurcharge(w) : 0;

      const popupContent = `
        <div class="lf-map-popup p-1" style="min-width: 220px;">
          <div class="d-flex align-items-center gap-2 mb-2">
            <div class="lf-worker-avatar" style="width:36px;height:36px;font-size:0.9rem;">
              ${w.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <div class="fw-bold text-dark mb-0 fs-6">${w.name}</div>
              <div class="small text-muted" style="font-size:0.75rem;">${LF_SERVICE_LABELS[w.category] || w.category}</div>
            </div>
          </div>
          <div class="d-flex justify-content-between align-items-center mb-2 small">
            <div>${ratingText}</div>
            <div class="fw-bold text-primary lf-mono">&#8377;${w.price}/visit</div>
          </div>
          <div class="small text-muted mb-2">
            <i class="bi bi-geo-alt me-1 text-danger"></i>${w.area}
            ${surcharge > 0 ? `<div class="text-warning small">+&#8377;${surcharge} travel</div>` : ""}
          </div>
          <div class="d-grid gap-1">
            <a href="${pathPrefix}worker-profile.html?id=${w.id}" class="btn btn-lf-outline btn-sm py-1" style="font-size:0.78rem;">View Profile</a>
            <a href="${pathPrefix}booking.html?worker=${w.id}" class="btn btn-lf-primary btn-sm py-1" style="font-size:0.78rem;">Book Now</a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      markers.push(marker);

      if (onMarkerClick) {
        marker.on("click", () => onMarkerClick(w));
      }
    });

    if (markers.length > 0) {
      const group = new L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.15));
    }

    return map;
  };

  /**
   * Initialize a worker single location / service area map
   */
  const initWorkerMap = (containerId, worker) => {
    const el = document.getElementById(containerId);
    if (!el || typeof L === "undefined" || !worker) return null;

    if (el._leaflet_id) {
      el._leaflet_map?.remove();
    }

    const lat = worker.lat || DEFAULT_CENTER[0];
    const lng = worker.lng || DEFAULT_CENTER[1];

    const map = L.map(containerId).setView([lat, lng], 14);
    el._leaflet_map = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      className: "lf-custom-pin",
      html: `
        <div class="lf-map-marker active">
          <div class="lf-marker-bubble">
            <i class="bi bi-person-fill"></i> ${worker.name.split(" ")[0]}
          </div>
          <div class="lf-marker-dot"></div>
        </div>
      `,
      iconSize: [60, 44],
      iconAnchor: [30, 42],
    });

    L.marker([lat, lng], { icon }).addTo(map).bindPopup(`<strong>${worker.name}</strong><br>${worker.area}`).openPopup();

    L.circle([lat, lng], {
      color: "#0284C7",
      fillColor: "#0284C7",
      fillOpacity: 0.12,
      radius: 3000,
    }).addTo(map);

    return map;
  };

  /**
   * Reverse Geocode (Lat/Lng -> Street Address) via Nominatim
   */
  const reverseGeocode = async (lat, lng, callback) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      if (data && data.display_name) {
        callback(data.display_name);
      }
    } catch {
      callback(`Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)}), Ludhiana`);
    }
  };

  /**
   * Interactive Address & Location Picker for Booking Form
   */
  const initLocationPicker = (containerId, onLocationSelected) => {
    const el = document.getElementById(containerId);
    if (!el || typeof L === "undefined") return null;

    if (el._leaflet_id) {
      el._leaflet_map?.remove();
    }

    const map = L.map(containerId).setView(DEFAULT_CENTER, 14);
    el._leaflet_map = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    let currentMarker = L.marker(DEFAULT_CENTER, {
      draggable: true,
      icon: L.divIcon({
        className: "lf-custom-pin",
        html: `
          <div class="lf-map-marker active">
            <div class="lf-marker-bubble">
              <i class="bi bi-geo-alt-fill text-danger"></i> Service Location
            </div>
            <div class="lf-marker-dot"></div>
          </div>
        `,
        iconSize: [80, 44],
        iconAnchor: [40, 42],
      }),
    }).addTo(map);

    const updatePosition = (lat, lng) => {
      currentMarker.setLatLng([lat, lng]);
      if (onLocationSelected) {
        onLocationSelected(lat, lng);
      }
    };

    map.on("click", (e) => {
      updatePosition(e.latlng.lat, e.latlng.lng);
      reverseGeocode(e.latlng.lat, e.latlng.lng, (addr) => {
        const addrInput = document.getElementById("addressInput");
        if (addrInput) addrInput.value = addr;
      });
    });

    currentMarker.on("dragend", (e) => {
      const pos = e.target.getLatLng();
      updatePosition(pos.lat, pos.lng);
      reverseGeocode(pos.lat, pos.lng, (addr) => {
        const addrInput = document.getElementById("addressInput");
        if (addrInput) addrInput.value = addr;
      });
    });

    return {
      map,
      setCenter: (lat, lng) => {
        map.setView([lat, lng], 15);
        updatePosition(lat, lng);
      },
      locateMe: () => {
        const btn = document.getElementById("btnLocateGps");
        if (btn) btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Detecting GPS...';

        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              map.setView([lat, lng], 16);
              updatePosition(lat, lng);
              reverseGeocode(lat, lng, (addr) => {
                const addrInput = document.getElementById("addressInput");
                if (addrInput) addrInput.value = addr;
              });
              lfShowToast("Live GPS location detected!");
              if (btn) btn.innerHTML = '<i class="bi bi-crosshair me-1"></i> Detect My GPS Location';
            },
            (err) => {
              if (btn) btn.innerHTML = '<i class="bi bi-crosshair me-1"></i> Detect My GPS Location';
              lfShowToast("GPS access not available. Please click directly on the map to set your location.", "info");
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
          );
        } else {
          if (btn) btn.innerHTML = '<i class="bi bi-crosshair me-1"></i> Detect My GPS Location';
          lfShowToast("Geolocation is not supported by your browser.", "info");
        }
      },
    };
  };

  return {
    initSearchMap,
    initWorkerMap,
    initLocationPicker,
  };
})();

window.LocalFixMap = LocalFixMap;
