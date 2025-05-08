declare module 'leaflet-routing-machine' {
  namespace L {
    namespace Routing {
      function control(options: any): any;
      function plan(waypoints: any, options?: any): any;
    }
  }
}

declare module 'leaflet-control-geocoder';

declare module 'leaflet-routing-machine/dist/leaflet-routing-machine.css' {
  const content: any;
  export default content;
}

declare module 'leaflet-control-geocoder/dist/Control.Geocoder.css' {
  const content: any;
  export default content;
} 