import React, { useEffect } from 'react';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from './dialog';
import LocationMap from './LocationMap';
import { cn } from "@/lib/utils";

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationData: {
    Address: string;
    Latitude: number;
    Longitude: number;
    Landmark?: string;
    Coordinates?: string;
    "Confidence Score"?: string;
  };
  userLocation: {
    lat: number;
    lng: number;
  };
}

// Custom dialog content without the default close button
const CustomDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg p-0 overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
CustomDialogContent.displayName = "CustomDialogContent";

const MapModal: React.FC<MapModalProps> = ({ 
  isOpen, 
  onClose, 
  locationData, 
  userLocation 
}) => {
  // Extract home location coordinates based on the Address field
  const getHomeCoordinates = async () => {
    if (!locationData?.Address) return userLocation;
    
    try {
      // Try to geocode the address to get coordinates
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationData.Address)}`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    } catch (error) {
      console.error("Error geocoding home address:", error);
    }
    
    // Fallback to the center of the country specified in Address
    const defaultLocations: {[key: string]: {lat: number, lng: number}} = {
      'India': { lat: 20.5937, lng: 78.9629 },
      'Canada': { lat: 56.1304, lng: -106.3468 },
      'USA': { lat: 37.0902, lng: -95.7129 },
      'UK': { lat: 55.3781, lng: -3.4360 }
    };
    
    return defaultLocations[locationData.Address] || userLocation || { lat: 20.5937, lng: 78.9629 };
  };
  
  // Use the address for the home location
  const [homeLocation, setHomeLocation] = React.useState(userLocation);
  
  // Load home location when the modal opens
  useEffect(() => {
    if (isOpen) {
      getHomeCoordinates().then(coords => {
        setHomeLocation(coords);
      });
    }
  }, [isOpen, locationData.Address]);
  
  // Extract coordinates from the locationData for the destination
  const parseCoordinates = () => {
    // First try to use the coordinates from the Coordinates string
    if (locationData?.Coordinates) {
      const coordsString = locationData.Coordinates;
      try {
        // Split by comma and parse as floats
        const [lat, lng] = coordsString.split(',').map(coord => parseFloat(coord.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      } catch (error) {
        console.error("Error parsing Coordinates string:", error);
      }
    }
    
    // Fallback to Latitude/Longitude fields
    return {
      lat: locationData?.Latitude || 0,
      lng: locationData?.Longitude || 0
    };
  };
  
  // Prepare destination location from locationData
  const destination = parseCoordinates();

  // Use the landmark as the destination name
  const destinationName = locationData?.Landmark || 'Destination';
  
  // Get coordinates string from the object
  const destinationCoordinates = locationData?.Coordinates || 
    `${destination.lat.toFixed(7)}, ${destination.lng.toFixed(7)}`;

  // Format the home address for display
  const homeAddress = locationData?.Address || 'Home';
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-[700px] md:max-w-[700px] lg:max-w-[700px] max-h-[95vh] p-0 gap-0 rounded-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm">
          <DialogTitle className="text-lg font-medium text-gray-800">
            Route to {destinationName}
          </DialogTitle>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500  transition-colors"
          >
          </button>
        </div>
        <div className="h-[75vh]">
          {isOpen && (
            <LocationMap
              origin={homeLocation}
              destination={destination}
              destinationAddress={destinationName}
              destinationCoordinates={destinationCoordinates}
              originAddress={homeAddress}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MapModal; 