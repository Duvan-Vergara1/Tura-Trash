// Entrega 1: el panel devuelve el usuario y los 4 módulos.
const { hoy } = require('../utils/fechas');

const MODULOS = [
  { clave: 'vehiculos', nombre: 'Vehículos', ruta: '/vehiculos', descripcion: 'Flota, estados operativos y disponibilidad.' },
  { clave: 'conductores', nombre: 'Conductores', ruta: '/conductores', descripcion: 'Personal, licencias y estado.' },
  { clave: 'rutas', nombre: 'Rutas', ruta: '/rutas', descripcion: 'Recorridos en el mapa, barrios y estado.' },
  { clave: 'programacion', nombre: 'Programación', ruta: '/programacion', descripcion: 'Turnos y asignación del servicio.' },
];

async function resumen(usuario) {
  return { usuario, fecha: hoy(), modulos: MODULOS };
}

module.exports = { resumen, MODULOS };
