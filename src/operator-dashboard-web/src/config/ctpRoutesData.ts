// Official CTP and ARESEP Concession Route 142 Data
// Based on CTP Oficio CTP-DT-DAC-INF-0557-2023 and ARESEP RE-0025-IT-2024 / RE-0115-IT-2026

export interface RouteStop {
  id: string
  name: string
  lat: number
  lon: number
  dwellSec?: number
  isTransferHub?: boolean
}

export interface ManagedRoute {
  routeId: string
  name: string
  fare: number
  busCount: number
  km: number
  color: string
  stops: RouteStop[]
  isTrunk?: boolean
  transferHubRequired?: boolean
}

export const officialCtpRoutes: ManagedRoute[] = [
  {
    routeId: 'R142',
    name: 'Ruta 142 · Troncal San José – Coronado Centro',
    fare: 460,
    busCount: 24,
    km: 11.33,
    color: '#1d4ed8', // Dark Blue
    stops: [
      { id: 's1', name: 'Terminal San José (Parque Central / C.3)', lat: 9.932732, lon: -84.079187, dwellSec: 60 },
      { id: 's2', name: 'Parada Hospital Calderón Guardia', lat: 9.936628, lon: -84.0789, dwellSec: 30 },
      { id: 's3', name: 'Parada Calle Blancos / Montelimar', lat: 9.940208, lon: -84.065309, dwellSec: 30 },
      { id: 's4', name: 'Parada Guadalupe Centro (Parque)', lat: 9.942398, lon: -84.063658, dwellSec: 45 },
      { id: 's5', name: 'Parada El Alto (Galerón de las Ofertas)', lat: 9.949788, lon: -84.048217, dwellSec: 30 },
      { id: 's6', name: 'Parada Entrada Ipís / Fátima', lat: 9.964252, lon: -84.031692, dwellSec: 30 },
      { id: 's7', name: 'Parada San Antonio de Coronado', lat: 9.966275, lon: -84.022372, dwellSec: 30 },
      { id: 's8', name: 'Terminal Central de Coronado (Intercambio)', lat: 9.976073, lon: -84.007282, dwellSec: 90 },
    ],
  },
  {
    routeId: 'R142-01',
    name: 'Ramal Cascajal',
    fare: 460,
    busCount: 2,
    km: 19.12,
    color: '#0284c7', // Sky Blue
    stops: [
      { id: 's10', name: 'Terminal Central de Coronado', lat: 9.976073, lon: -84.007282, dwellSec: 60 },
      { id: 's11', name: 'Parada San Jerónimo Centro', lat: 9.981341, lon: -84.004155, dwellSec: 30 },
      { id: 's12', name: 'Parada Alto Palma', lat: 9.983425, lon: -83.978548, dwellSec: 30 },
      { id: 's13', name: 'Parada Cascajal Escuela', lat: 10.021134, lon: -83.948202, dwellSec: 30 },
      { id: 's14', name: 'Terminal Cascajal Retorno', lat: 10.037699, lon: -83.929755, dwellSec: 60 },
    ],
  },
  {
    routeId: 'R142-02',
    name: 'Ramal Las Nubes',
    fare: 460,
    busCount: 2,
    km: 6.51,
    color: '#0d9488', // Teal
    stops: [
      { id: 's20', name: 'Terminal Central de Coronado', lat: 9.976073, lon: -84.007282, dwellSec: 60 },
      { id: 's21', name: 'Parada San Isidro Alto', lat: 9.98067, lon: -84.006031, dwellSec: 30 },
      { id: 's22', name: 'Parada Entrada Montserrat', lat: 9.981116, lon: -83.995355, dwellSec: 30 },
      { id: 's23', name: 'Terminal Las Nubes', lat: 9.98822, lon: -83.960535, dwellSec: 60 },
    ],
  },
  {
    routeId: 'R142-03',
    name: 'Ramal Dulce Nombre',
    fare: 400,
    busCount: 2,
    km: 1.83,
    color: '#16a34a', // Green
    stops: [
      { id: 's30', name: 'Terminal Central de Coronado', lat: 9.976073, lon: -84.007282, dwellSec: 60 },
      { id: 's31', name: 'Parada Los Cedros', lat: 9.977801, lon: -84.010873, dwellSec: 30 },
      { id: 's32', name: 'Terminal Dulce Nombre Centro', lat: 9.984356, lon: -84.015394, dwellSec: 60 },
    ],
  },
  {
    routeId: 'R142-04',
    name: 'Ramal Patio de Agua',
    fare: 400,
    busCount: 2,
    km: 6.14,
    color: '#ca8a04', // Amber/Gold
    stops: [
      { id: 's40', name: 'Terminal Central de Coronado', lat: 9.976073, lon: -84.007282, dwellSec: 60 },
      { id: 's41', name: 'Parada Cruce San Jerónimo', lat: 9.981422, lon: -84.005304, dwellSec: 30 },
      { id: 's42', name: 'Parada Quebrada Honda', lat: 9.979325, lon: -83.97313, dwellSec: 30 },
      { id: 's43', name: 'Terminal Patio de Agua', lat: 9.975912, lon: -83.966428, dwellSec: 60 },
    ],
  },
  {
    routeId: 'R142-05',
    name: 'Ramal San Rafael',
    fare: 400,
    busCount: 2,
    km: 2.34,
    color: '#ea580c', // Orange
    stops: [
      { id: 's50', name: 'Terminal Central de Coronado', lat: 9.976073, lon: -84.007282, dwellSec: 60 },
      { id: 's51', name: 'Parada Cruce San Rafael', lat: 9.979601, lon: -84.006638, dwellSec: 30 },
      { id: 's52', name: 'Parada Escuela San Rafael', lat: 9.981163, lon: -84.005868, dwellSec: 30 },
      { id: 's53', name: 'Terminal San Rafael Retorno', lat: 9.98069, lon: -83.991828, dwellSec: 60 },
    ],
  },
  {
    routeId: 'R142-06',
    name: 'Ramal Patalillo',
    fare: 400,
    busCount: 2,
    km: 2.48,
    color: '#e11d48', // Rose
    stops: [
      { id: 's60', name: 'Terminal Central de Coronado', lat: 9.976073, lon: -84.007282, dwellSec: 60 },
      { id: 's61', name: 'Parada Urbanización La Calabria', lat: 9.9768, lon: -84.012516, dwellSec: 30 },
      { id: 's62', name: 'Parada Patalillo Iglesia', lat: 9.975485, lon: -84.017926, dwellSec: 30 },
      { id: 's63', name: 'Terminal Patalillo', lat: 9.973514, lon: -84.02635, dwellSec: 60 },
    ],
  },
  {
    routeId: 'R142-07',
    name: 'Ramal San Pedro',
    fare: 400,
    busCount: 1,
    km: 1.43,
    color: '#9333ea', // Purple
    stops: [
      { id: 's70', name: 'Terminal Central de Coronado', lat: 9.976073, lon: -84.007282, dwellSec: 60 },
      { id: 's71', name: 'Parada Cruce San Pedro', lat: 9.981922, lon: -84.005718, dwellSec: 30 },
      { id: 's72', name: 'Terminal San Pedro', lat: 9.987664, lon: -84.005772, dwellSec: 60 },
    ],
  },
  {
    routeId: 'R142-08',
    name: 'Ramal El Rodeo',
    fare: 400,
    busCount: 1,
    km: 3.78,
    color: '#475569', // Slate
    stops: [
      { id: 's80', name: 'Terminal Central de Coronado', lat: 9.976073, lon: -84.007282, dwellSec: 60 },
      { id: 's81', name: 'Parada Vista de Mar', lat: 9.976111, lon: -84.000566, dwellSec: 30 },
      { id: 's82', name: 'Parada El Rodeo Centro', lat: 9.967027, lon: -83.997982, dwellSec: 30 },
      { id: 's83', name: 'Terminal El Rodeo', lat: 9.964763, lon: -83.986955, dwellSec: 60 },
    ],
  },
  {
    routeId: 'R142-09',
    name: 'Ramal San Francisco',
    fare: 400,
    busCount: 1,
    km: 2.57,
    color: '#0891b2', // Cyan
    stops: [
      { id: 's90', name: 'Terminal Central de Coronado', lat: 9.976073, lon: -84.007282, dwellSec: 60 },
      { id: 's91', name: 'Parada Barrio San Francisco', lat: 9.973402, lon: -84.011419, dwellSec: 30 },
      { id: 's92', name: 'Terminal San Francisco Retorno', lat: 9.964644, lon: -84.019973, dwellSec: 60 },
    ],
  },
  {
    routeId: 'R142-10',
    name: 'Ramal La Colmena',
    fare: 400,
    busCount: 0,
    km: 3.0,
    color: '#65a30d', // Lime
    stops: [
      { id: 's100', name: 'Terminal Central de Coronado', lat: 9.976073, lon: -84.007282, dwellSec: 60 },
      { id: 's101', name: 'Parada El Carmen', lat: 9.982935, lon: -84.001173, dwellSec: 30 },
      { id: 's102', name: 'Terminal La Colmena', lat: 9.989933, lon: -83.990767, dwellSec: 60 },
    ],
  },
  {
    routeId: 'R142-11',
    name: 'Periférica Coronado e Ipís',
    fare: 410,
    busCount: 0,
    km: 5.2,
    color: '#c026d3', // Fuchsia
    stops: [
      { id: 's110', name: 'Terminal Central de Coronado', lat: 9.976073, lon: -84.007282, dwellSec: 60 },
      { id: 's111', name: 'Parada Ipís Centro', lat: 9.964962, lon: -84.03035, dwellSec: 30 },
      { id: 's112', name: 'Parada Urbanización Rodrigo Facio', lat: 9.968044, lon: -84.010216, dwellSec: 30 },
    ],
  },
]
