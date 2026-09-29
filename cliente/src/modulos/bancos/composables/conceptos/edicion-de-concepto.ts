import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { DatosConcepto, Concepto } from '../../servicios/conceptos.api';

export const OPCIONES_DE_APLICA_A = { credito: 'Créditos', debito: 'Débitos', ambos: 'Ambos' };

export const OPCIONES_DE_ACTIVIDAD_DE_FLUJO = {
  operacion: 'Operación',
  inversion: 'Inversión',
  financiamiento: 'Financiamiento',
  ninguna: 'Ninguna',
};

/** Lo que muestra cada campo de la ventana mientras se edita un concepto. */
export interface EdicionDeConcepto {
  abierta: boolean;
  id: string | null;
  nombre: string;
  aplicaA: 'credito' | 'debito' | 'ambos';
  actividadDeFlujo: 'operacion' | 'inversion' | 'financiamiento' | 'ninguna';
  grupoDeFlujo: string;
  esCargoBancario: boolean;
  pideDatosDeIntereses: boolean;
  admiteFactura: boolean;
  activo: boolean;
}

const CONCEPTO_NUEVO: Omit<EdicionDeConcepto, 'abierta' | 'id'> = {
  nombre: '',
  aplicaA: 'credito',
  actividadDeFlujo: 'operacion',
  grupoDeFlujo: '',
  esCargoBancario: false,
  pideDatosDeIntereses: false,
  admiteFactura: false,
  activo: true,
};

/** La ventana abierta con los datos del concepto, o vacía si es nuevo. */
export function edicionDe(concepto?: Concepto): EdicionDeConcepto {
  if (!concepto) return { abierta: true, id: null, ...CONCEPTO_NUEVO };
  return {
    abierta: true,
    id: concepto.id,
    nombre: textoDeEdicion(concepto.nombre),
    aplicaA: concepto.aplicaA,
    actividadDeFlujo: concepto.actividadDeFlujo,
    grupoDeFlujo: textoDeEdicion(concepto.grupoDeFlujo),
    esCargoBancario: concepto.esCargoBancario,
    pideDatosDeIntereses: concepto.pideDatosDeIntereses,
    admiteFactura: concepto.admiteFactura,
    activo: concepto.activo,
  };
}

/** Lo que se manda al servidor: lo vacío como `null` y los números como números. */
export const datosDeConcepto = (edicion: EdicionDeConcepto): DatosConcepto => ({
  nombre: edicion.nombre,
  aplicaA: edicion.aplicaA,
  actividadDeFlujo: edicion.actividadDeFlujo,
  grupoDeFlujo: textoONulo(edicion.grupoDeFlujo),
  esCargoBancario: edicion.esCargoBancario,
  pideDatosDeIntereses: edicion.pideDatosDeIntereses,
  admiteFactura: edicion.admiteFactura,
  activo: edicion.activo,
});
