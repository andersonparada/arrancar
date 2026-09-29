import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';

/** Las columnas del Excel de los conceptos: los mismos datos del formulario, en el mismo orden. */
export const columnasDeConceptos = (): Columna[] => [
  { clave: 'nombre', titulo: 'Nombre', requerido: true, tipo: 'texto' },
  {
    clave: 'aplicaA',
    titulo: 'Aplica a',
    requerido: true,
    tipo: 'lista',
    opciones: { credito: 'Nota de crédito', debito: 'Nota de débito', ambos: 'Ambas' },
  },
  {
    clave: 'actividadDeFlujo',
    titulo: 'Actividad del flujo de efectivo',
    requerido: true,
    tipo: 'lista',
    opciones: { operacion: 'Operación', inversion: 'Inversión', financiamiento: 'Financiamiento', ninguna: 'Ninguna' },
  },
  { clave: 'grupoDeFlujo', titulo: 'Grupo del flujo de efectivo', requerido: false, tipo: 'texto' },
  { clave: 'esCargoBancario', titulo: 'Lo origina el banco', requerido: true, tipo: 'siNo' },
  { clave: 'pideDatosDeIntereses', titulo: 'Pide datos de intereses', requerido: true, tipo: 'siNo' },
  { clave: 'admiteFactura', titulo: 'Admite factura', requerido: true, tipo: 'siNo' },
  { clave: 'activo', titulo: 'Activo', requerido: true, tipo: 'siNo' },
];
