import { formatearOpcion, formatearSiNo, formatearTexto } from '@/modulos/core/utilidades/formato';
import { OPCIONES_DE_APLICA_A, OPCIONES_DE_ACTIVIDAD_DE_FLUJO } from './edicion-de-concepto';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Concepto } from '../../servicios/conceptos.api';

/** Lo que muestra la tarjeta del concepto además de nombre, ya con formato. */
export const detallesDeConcepto = (registro: Concepto): DetalleDeRegistro[] => [
  { etiqueta: 'Se usa en', valor: formatearOpcion(OPCIONES_DE_APLICA_A, registro.aplicaA) },
  {
    etiqueta: 'Actividad del flujo de efectivo',
    valor: formatearOpcion(OPCIONES_DE_ACTIVIDAD_DE_FLUJO, registro.actividadDeFlujo),
  },
  { etiqueta: 'Grupo del flujo de efectivo', valor: formatearTexto(registro.grupoDeFlujo) },
  { etiqueta: 'Lo origina el banco', valor: formatearSiNo(registro.esCargoBancario) },
  { etiqueta: 'Pide datos de intereses', valor: formatearSiNo(registro.pideDatosDeIntereses) },
  { etiqueta: 'Admite factura', valor: formatearSiNo(registro.admiteFactura) },
];
