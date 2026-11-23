import { textoDeEdicion } from '@/modulos/core/utilidades/edicion';
import type { DatosConceptoDeIngreso, ConceptoDeIngreso } from '../../servicios/conceptos-de-ingreso.api';

export const OPCIONES_DE_TIPO = { bien: 'Bien', servicio: 'Servicio' };

/** Lo que muestra cada campo de la ventana mientras se edita un concepto de ingreso. */
export interface EdicionDeConceptoDeIngreso {
  abierta: boolean;
  id: string | null;
  nombre: string;
  tipo: 'bien' | 'servicio';
  activo: boolean;
}

const CONCEPTO_DE_INGRESO_NUEVO: Omit<EdicionDeConceptoDeIngreso, 'abierta' | 'id'> = {
  nombre: '',
  tipo: 'bien',
  activo: true,
};

/** La ventana abierta con los datos del concepto de ingreso, o vacía si es nuevo. */
export function edicionDe(conceptoDeIngreso?: ConceptoDeIngreso): EdicionDeConceptoDeIngreso {
  if (!conceptoDeIngreso) return { abierta: true, id: null, ...CONCEPTO_DE_INGRESO_NUEVO };
  return {
    abierta: true,
    id: conceptoDeIngreso.id,
    nombre: textoDeEdicion(conceptoDeIngreso.nombre),
    tipo: conceptoDeIngreso.tipo,
    activo: conceptoDeIngreso.activo,
  };
}

/** Lo que se manda al servidor: lo vacío como `null` y los números como números. */
export const datosDeConceptoDeIngreso = (edicion: EdicionDeConceptoDeIngreso): DatosConceptoDeIngreso => ({
  nombre: edicion.nombre,
  tipo: edicion.tipo,
  activo: edicion.activo,
});
