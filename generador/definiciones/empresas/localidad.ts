import { definirRecurso, entero, referencia, texto } from '../../src/definicion/indice.js';

/**
 * Localidad (finca, planta, oficina…): sitio de una empresa con acceso por registro (H5b del
 * plan de hallazgos contables). Sus accesos viven en `empresas.accesos_a_localidades`.
 * Genere su código con:
 *   npm run generar -- recurso empresas/localidad
 */
export const recurso = definirRecurso({
  modulo: 'empresas',
  entidad: 'Localidad',
  plural: 'Localidades',
  textos: { singular: 'localidad', plural: 'localidades' },
  genero: 'femenino',
  alcance: 'empresa',
  pantalla: 'completa',
  seccion: 'administracion',
  icono: 'MapPin',
  baja: 'inactivar',
  mostrar: 'nombre',
  campos: {
    codigo: texto({ requerido: true, unico: true, largoMaximo: 12, etiqueta: 'Código interno' }),
    nombre: texto({ requerido: true, unico: true, largoMaximo: 120 }),
    tipo: referencia('TipoDeLocalidad', { requerido: true }),
    codigoEstablecimientoSat: entero({ minimo: 1, etiqueta: 'Código de establecimiento SAT' }),
    nombreComercialSat: texto({ largoMaximo: 200, etiqueta: 'Nombre comercial SAT' }),
    departamentoCodigo: texto({ largoMaximo: 2, etiqueta: 'Departamento' }),
    municipioCodigo: texto({ largoMaximo: 2, etiqueta: 'Municipio' }),
    direccion: texto({ largoMaximo: 300 }),
  },
});
