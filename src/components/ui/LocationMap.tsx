'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/styles/map.css'; // Import our custom map styles

// Define missing types
interface LocationMapProps {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  destinationAddress: string;
  destinationCoordinates?: string;
  originAddress?: string;
}

interface RoutingControlProps {
  startLatLng: [number, number];
  endLatLng: [number, number];
}

// We need to declare these modules to add them to the Leaflet namespace
declare module 'leaflet' {
  namespace Routing {
    function control(options: any): any;
    function plan(waypoints: any, options?: any): any;
  }
}

// Define different icons for start and end points
let StartIcon: L.Icon;
let DestinationIcon: L.Icon;

// Routing control component (must be inside MapContainer)
const RoutingControl: React.FC<RoutingControlProps> = ({ startLatLng, endLatLng }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!map || !StartIcon || !DestinationIcon) return;
    
    console.log("Setting up routing with start:", startLatLng, "and end:", endLatLng);

    // Add start and end markers with appropriate icons
    const startMarker = L.marker([startLatLng[0], startLatLng[1]], {
      icon: StartIcon,
      draggable: false
    }).addTo(map);
    
    const endMarker = L.marker([endLatLng[0], endLatLng[1]], {
      icon: DestinationIcon
    }).addTo(map);
    
    // Apply custom CSS classes to the marker elements once they're added to the DOM
    setTimeout(() => {
      const startMarkerElement = startMarker.getElement();
      const endMarkerElement = endMarker.getElement();
      
      if (startMarkerElement) {
        startMarkerElement.classList.add('origin-marker');
      }
      
      if (endMarkerElement) {
        endMarkerElement.classList.add('destination-marker');
      }
    }, 100);
    
    startMarker.bindPopup('<strong>Start:</strong> Home location').openPopup();
    endMarker.bindPopup('<strong>Destination:</strong> Target location');
    
    // Calculate bounds with padding to fit both markers
    const bounds = L.latLngBounds([
      L.latLng(startLatLng[0], startLatLng[1]),
      L.latLng(endLatLng[0], endLatLng[1])
    ]);
    
    // Add significant padding to ensure the route fits
    map.fitBounds(bounds, { 
      padding: [80, 80],
      maxZoom: 6 // Limit max zoom to ensure we don't zoom in too far for large distances
    });

    // For very large distances, we might want to avoid detailed routing
    // Calculate distance between points
    const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Radius of the Earth in km
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Distance in km
    };
    
    const distance = calcDistance(startLatLng[0], startLatLng[1], endLatLng[0], endLatLng[1]);
    
    // For very large distances (>5000km), just draw a simple line instead of using routing machine
    if (distance > 5000) {
      const polyline = L.polyline([
        [startLatLng[0], startLatLng[1]],
        [endLatLng[0], endLatLng[1]]
      ], {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.7,
        lineJoin: 'round'
      }).addTo(map);
      
      return () => {
        map.removeLayer(startMarker);
        map.removeLayer(endMarker);
        map.removeLayer(polyline);
      };
    }

    // For closer distances, use the routing machine but hide the directions panel
    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(startLatLng[0], startLatLng[1]),
        L.latLng(endLatLng[0], endLatLng[1]),
      ],
      routeWhileDragging: false,
      showAlternatives: false,
      fitSelectedRoutes: false, // We handle fitting manually above
      show: false, // Hide the routing control completely
      collapsible: true, // Allow collapsing the control
      collapsed: true, // Start collapsed
      autoRoute: true, // Calculate the route automatically
      useZoomParameter: true,
      lineOptions: {
        styles: [{ color: '#3b82f6', weight: 4, opacity: 0.7 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      },
      // Hide the itinerary (directions list)
      createMarker: function() { return null; }, // We create markers manually above
      addWaypoints: false,
    }).addTo(map);

    // Hide the itinerary container after the control is added
    setTimeout(() => {
      const itineraryContainer = document.querySelector('.leaflet-routing-container');
      if (itineraryContainer) {
        itineraryContainer.classList.add('hidden-itinerary');
        (itineraryContainer as HTMLElement).style.display = 'none';
      }
    }, 100);

    // Clean up routing control on component unmount
    return () => {
      map.removeLayer(startMarker);
      map.removeLayer(endMarker);
      map.removeControl(routingControl);
    };
  }, [map, startLatLng, endLatLng]); 

  return null;
};

// Main component
const LocationMap: React.FC<LocationMapProps> = ({ 
  origin, 
  destination, 
  destinationAddress,
  destinationCoordinates,
  originAddress = "Home"
}) => {
  // State to track if leaflet plugins are loaded
  const [pluginsLoaded, setPluginsLoaded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(origin);
  const [customDestination, setCustomDestination] = useState(destinationAddress);
  const [isEditingDestination, setIsEditingDestination] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isEditingOrigin, setIsEditingOrigin] = useState(false);
  const [isGeocodingOrigin, setIsGeocodingOrigin] = useState(false);
  const [customOrigin, setCustomOrigin] = useState(originAddress);
  const defaultHomeCoordinates = { lat: 20.5937, lng: 78.9629 }; // Center of India as default
  
  // Update current location when origin prop changes
  useEffect(() => {
    console.log("Origin changed:", origin);
    // If origin coordinates are clearly not set (0,0 or similar), use India
    if (Math.abs(origin.lat) < 0.001 && Math.abs(origin.lng) < 0.001) {
      setCurrentLocation(defaultHomeCoordinates);
    } else {
      setCurrentLocation(origin);
    }
  }, [origin]);
  
  // Parse destination coordinates from string if provided
  const parseCoordinates = (coordsString: string | undefined) => {
    if (!coordsString) return destination;
    
    try {
      const [lat, lng] = coordsString.split(',').map(coord => parseFloat(coord.trim()));
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    } catch (error) {
      console.error("Error parsing coordinates:", error);
    }
    
    return destination;
  };
  
  const [destinationCoords, setDestinationCoords] = useState(
    parseCoordinates(destinationCoordinates) || destination
  );
  
  // For displaying coordinates
  const [coordinatesString, setCoordinatesString] = useState(
    destinationCoordinates || `${destination.lat.toFixed(7)}, ${destination.lng.toFixed(7)}`
  );
  
  // For displaying origin coordinates
  const [originCoordinatesString, setOriginCoordinatesString] = useState(
    `${origin.lat.toFixed(7)}, ${origin.lng.toFixed(7)}`
  );

  // Update destination coordinates when props change
  useEffect(() => {
    if (destinationCoordinates) {
      const parsedCoords = parseCoordinates(destinationCoordinates);
      setDestinationCoords(parsedCoords);
    } else {
      setDestinationCoords(destination);
    }
  }, [destination, destinationCoordinates]);

  // Function to get current location using browser geolocation
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(newLocation);
          setOriginCoordinatesString(`${newLocation.lat.toFixed(7)}, ${newLocation.lng.toFixed(7)}`);
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsLocating(false);
          alert("Could not get your current location. Please check your location permissions.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  // Function to handle geocoding of origin address
  const handleGeocodeOrigin = async () => {
    if (!customOrigin.trim()) return;
    
    setIsGeocodingOrigin(true);
    try {
      // Use OpenStreetMap Nominatim for geocoding
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(customOrigin)}`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const newCoords = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };
        setCurrentLocation(newCoords);
        // Update the coordinates display
        setOriginCoordinatesString(`${newCoords.lat.toFixed(7)}, ${newCoords.lng.toFixed(7)}`);
        setIsEditingOrigin(false);
      } else {
        alert("Location not found. Please try a different search term.");
      }
    } catch (error) {
      console.error("Error geocoding origin:", error);
      alert("Error finding location. Please try again.");
    } finally {
      setIsGeocodingOrigin(false);
    }
  };

  // Function to handle geocoding of destination address
  const handleGeocodeDestination = async () => {
    if (!customDestination.trim()) return;
    
    setIsGeocoding(true);
    try {
      // Use OpenStreetMap Nominatim for geocoding
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(customDestination)}`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const newCoords = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };
        setDestinationCoords(newCoords);
        // Update the coordinates display
        setCoordinatesString(`${newCoords.lat.toFixed(7)}, ${newCoords.lng.toFixed(7)}`);
        setIsEditingDestination(false);
      } else {
        alert("Location not found. Please try a different search term.");
      }
    } catch (error) {
      console.error("Error geocoding destination:", error);
      alert("Error finding location. Please try again.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, isOrigin: boolean) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isOrigin) {
        handleGeocodeOrigin();
      } else {
        handleGeocodeDestination();
      }
    }
  };

  // Dynamically import leaflet plugins on the client side only
  useEffect(() => {
    async function loadPlugins() {
      if (typeof window !== 'undefined') {
        try {
          // Import CSS - use dynamic imports
          await import('leaflet-routing-machine/dist/leaflet-routing-machine.css');
          await import('leaflet-control-geocoder/dist/Control.Geocoder.css');
          
          // Import JS - use dynamic imports
          await import('leaflet-routing-machine');
          await import('leaflet-control-geocoder');
          
          // Set up the default markers
          StartIcon = L.icon({
            iconUrl: '/leaflet/marker-icon-red.png',
            shadowUrl: '/leaflet/marker-shadow.png',
            iconSize: [28, 45],
            iconAnchor: [14, 45],
            popupAnchor: [1, -34],
          });
          
          DestinationIcon = L.icon({
            iconUrl: '/leaflet/marker-icon-blue.png',
            shadowUrl: '/leaflet/marker-shadow.png',
            iconSize: [28, 45],
            iconAnchor: [14, 45],
            popupAnchor: [1, -34],
          });
          
          // Set the default icon for any other markers
          L.Marker.prototype.options.icon = DestinationIcon;
          
          setPluginsLoaded(true);
        } catch (error) {
          console.error("Error loading Leaflet plugins:", error);
        }
      }
    }
    
    loadPlugins();
  }, []);

  const center: [number, number] = [
    (currentLocation.lat + destinationCoords.lat) / 2,
    (currentLocation.lng + destinationCoords.lng) / 2,
  ];
  
  // Calculate the approximate distance in kilometers using the Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  };

  const distance = calculateDistance(currentLocation.lat, currentLocation.lng, destinationCoords.lat, destinationCoords.lng);

  // Calculate a good initial zoom level based on distance
  const getInitialZoom = (): number => {
    // Calculate rough distance between points in km
    const distance = calculateDistance(
      currentLocation.lat, 
      currentLocation.lng, 
      destinationCoords.lat, 
      destinationCoords.lng
    );
    
    // Adjust zoom based on distance
    if (distance > 10000) return 1; // Extremely long distance
    if (distance > 5000) return 2;
    if (distance > 2000) return 3;
    if (distance > 1000) return 4;
    if (distance > 500) return 5;
    if (distance > 200) return 6;
    if (distance > 50) return 7;
    if (distance > 20) return 8;
    if (distance > 10) return 9;
    if (distance > 5) return 10;
    return 11;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-white px-4 py-3 border-b shadow-sm">
        {/* From/To Inputs */}
        <div className="space-y-3">
          {/* Origin Input */}
          <div className="flex items-center">
            <span className="font-medium text-gray-700 w-16 text-sm">From:</span>
            <div className="flex-1 flex items-center justify-between">
              {isEditingOrigin ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={customOrigin}
                    onChange={(e) => setCustomOrigin(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, true)}
                    placeholder="Enter your home address..."
                    className="flex-1 py-1.5 px-3 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={handleGeocodeOrigin}
                    disabled={isGeocodingOrigin}
                    className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md transition-colors"
                  >
                    {isGeocodingOrigin ? "Finding..." : "Find"}
                  </button>
                  <button
                    onClick={() => setIsEditingOrigin(false)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-800">{customOrigin}</span>
                    <span className="text-xs text-gray-500 font-mono mt-0.5">{originCoordinatesString}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsEditingOrigin(true)}
                      className="text-xs bg-white hover:bg-gray-50 border border-gray-300 text-blue-600 px-3 py-1.5 rounded-md flex items-center transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Destination Input */}
          <div className="flex items-center">
            <span className="font-medium text-gray-700 w-16 text-sm">To:</span>
            <div className="flex-1 flex items-center justify-between">
              {isEditingDestination ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={customDestination}
                    onChange={(e) => setCustomDestination(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, false)}
                    placeholder="Enter destination..."
                    className="flex-1 py-1.5 px-3 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={handleGeocodeDestination}
                    disabled={isGeocoding}
                    className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md transition-colors"
                  >
                    {isGeocoding ? "Finding..." : "Find"}
                  </button>
                  <button
                    onClick={() => setIsEditingDestination(false)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-800">{customDestination.split('(').pop()?.replace(')', '') || customDestination}</span>
                    <span className="text-xs text-gray-500 font-mono mt-0.5">{coordinatesString}</span>
                  </div>
                  <button
                    onClick={() => setIsEditingDestination(true)}
                    className="text-xs bg-white hover:bg-gray-50 border border-gray-300 text-blue-600 px-3 py-1.5 rounded-md flex items-center transition-colors"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Distance Badge */}
          <div className="flex justify-end">
            <div className="text-sm bg-blue-600 text-white px-4 py-1 rounded-full font-medium">
              {distance.toLocaleString()} km
            </div>
          </div>
        </div>
      </div>
      
      {/* Map Container */}
      <div className="flex-grow relative">
        {pluginsLoaded ? (
          <MapContainer
            center={center}
            zoom={getInitialZoom()}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
            zoomControl={true}
            className="z-10"
            maxBounds={[[-90, -180], [90, 180]]}
            minZoom={2}
            worldCopyJump={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://cartodb.com/attributions">CartoDB</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              noWrap={true}
            />
            <RoutingControl 
              startLatLng={[currentLocation.lat, currentLocation.lng]} 
              endLatLng={[destinationCoords.lat, destinationCoords.lng]} 
            />
          </MapContainer>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-gray-600 text-sm">Loading map...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationMap; 