import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./LocationPicker.css";

// Default map position only — selected location is NOT restricted to Khammam
const DEFAULT_POSITION = [17.2473, 80.1514];

const markerIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function MapUpdater({ position }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, 15);
  }, [map, position]);

  return null;
}

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect([
        event.latlng.lat,
        event.latlng.lng,
      ]);
    },
  });

  return null;
}

export default function LocationPicker({
  onLocationSelect,
}) {
  const [position, setPosition] =
    useState(DEFAULT_POSITION);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [address, setAddress] =
    useState("");

  // Reverse geocode ANY selected location
  async function updateLocation(coords) {
    setPosition(coords);
    setError("");
    setLoading(true);

    try {
      const params = new URLSearchParams({
        lat: String(coords[0]),
        lon: String(coords[1]),
        format: "jsonv2",
        addressdetails: "1",
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${params}`,
        {
          headers: {
            Accept: "application/json",
            "Accept-Language": "en",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "Location lookup failed"
        );
      }

      const data =
        await response.json();

      const locationAddress =
        data.address || {};

      // Actual area of selected location
      const areaName =
        locationAddress.suburb ||
        locationAddress.neighbourhood ||
        locationAddress.village ||
        locationAddress.town ||
        locationAddress.city_district ||
        locationAddress.city ||
        locationAddress.county ||
        "";

      // Full address including available pincode
      const fullAddress =
        data.display_name ||
        data.name ||
        `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;

      setAddress(fullAddress);

      // Send ALL location information to App.jsx
      onLocationSelect?.({
        latitude: coords[0],
        longitude: coords[1],
        area: areaName,
        address: fullAddress,
      });
    } catch (lookupError) {
      console.error(
        "Reverse geocoding error:",
        lookupError
      );

      const coordinateAddress =
        `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;

      setAddress(coordinateAddress);

      // No forced Khammam here
      onLocationSelect?.({
        latitude: coords[0],
        longitude: coords[1],
        area: "",
        address: coordinateAddress,
      });

      setError(
        "Full address could not be fetched. Coordinates were saved."
      );
    } finally {
      setLoading(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError(
        "Location is not supported by this browser."
      );
      return;
    }

    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const location = [
          coords.latitude,
          coords.longitude,
        ];

        await updateLocation(location);
      },

      (geoError) => {
        console.error(geoError);

        setError(
          "Location permission denied or unavailable."
        );

        setLoading(false);
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  }

  return (
    <div className="location-picker">

      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={loading}
      >
        {loading
          ? "Getting Location..."
          : "📍 Use My Current Location"}
      </button>

      {error && (
        <p className="location-error">
          {error}
        </p>
      )}

      <MapContainer
        center={DEFAULT_POSITION}
        zoom={13}
        scrollWheelZoom
        className="location-map"
      >

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater
          position={position}
        />

        {/* MAP CLICK */}
        <MapClickHandler
          onSelect={updateLocation}
        />

        {/* DRAG MARKER */}
        <Marker
          position={position}
          icon={markerIcon}
          draggable
          eventHandlers={{
            dragend(event) {
              const coords =
                event.target.getLatLng();

              updateLocation([
                coords.lat,
                coords.lng,
              ]);
            },
          }}
        >
          <Popup>
            Selected service location
          </Popup>
        </Marker>

      </MapContainer>

      <p className="map-caption">
        © OpenStreetMap contributors · Click
        the map or drag the pin to select the
        exact location.
      </p>

      {address && (
        <p className="selected-address">
          📍 {address}
        </p>
      )}

    </div>
  );
}
