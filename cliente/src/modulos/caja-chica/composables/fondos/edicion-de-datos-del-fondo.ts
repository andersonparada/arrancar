import { textoONulo } from '@/modulos/core/utilidades/edicion';
import type { EdicionSolicitada, Fondo } from '../../servicios/tipos-de-fondos';
import { montoEscrito } from './edicion-de-fondo';

/** Lo que se corrige de un fondo abierto: su nombre, localidad, tope por comprobante y cuenta para reponer. */
export interface EdicionDeDatosDelFondo {
  nombre: string;
  localidadId: string | null;
  tope: string | number | null;
  cuentaBancariaId: string | null;
  motivo: string;
}

/** La edición parte de lo que el fondo tiene hoy, para cambiar solo lo que haga falta. */
export const edicionDeDatosDelFondo = (fondo: Fondo | null): EdicionDeDatosDelFondo =>
  fondo
    ? {
        nombre: fondo.nombre,
        localidadId: fondo.localidadId,
        tope: fondo.topePorComprobante ?? '',
        cuentaBancariaId: fondo.cuentaBancariaId,
        motivo: '',
      }
    : { nombre: '', localidadId: null, tope: '', cuentaBancariaId: null, motivo: '' };

/** El tope escrito, o nada si se dejó vacío (vuelve el de la empresa). */
const topeEscrito = (edicion: EdicionDeDatosDelFondo): string | null => textoONulo(montoEscrito(edicion.tope));

/** Si el tope escrito es otro que el del fondo; solo entonces tiene sentido pedir el motivo. */
export function cambiaElTope(edicion: EdicionDeDatosDelFondo, fondo: Fondo | null): boolean {
  const actual = fondo?.topePorComprobante ?? null;
  const nuevo = topeEscrito(edicion);
  return (nuevo === null ? null : Number(nuevo)) !== (actual === null ? null : Number(actual));
}

/** Lo que falta escribir: el nombre. El servidor revisa el resto (repetido, tope inválido). */
export function faltaDelFondo(edicion: EdicionDeDatosDelFondo): Record<string, string> {
  return edicion.nombre.trim() ? {} : { nombre: 'Escriba el nombre del fondo.' };
}

/** El cuerpo de `PATCH /fondos/:id`: vacío en localidad, tope o cuenta los limpia; el motivo solo viaja si cambió el tope. */
export function cuerpoDeEdicionDelFondo(edicion: EdicionDeDatosDelFondo, fondo: Fondo | null): EdicionSolicitada {
  return {
    nombre: edicion.nombre.trim(),
    localidadId: edicion.localidadId,
    topePorComprobante: topeEscrito(edicion),
    cuentaBancariaId: edicion.cuentaBancariaId,
    motivo: cambiaElTope(edicion, fondo) ? textoONulo(edicion.motivo) : null,
  };
}
