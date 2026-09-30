import { textoDeEdicion } from '@/modulos/core/utilidades/edicion';
import type { DatosConceptoDeGasto, ConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';

export const OPCIONES_DE_TIPO_POR_OMISION = { bien: 'Bien', servicio: 'Servicio' };

/** Lo que muestra cada campo de la ventana mientras se edita un concepto de gasto. */
export interface EdicionDeConceptoDeGasto {
  abierta: boolean;
  id: string | null;
  nombre: string;
  tipoPorOmision: 'bien' | 'servicio';
  esProductoAgropecuario: boolean;
  esActivoFijo: boolean;
  activo: boolean;
}

const CONCEPTO_DE_GASTO_NUEVO: Omit<EdicionDeConceptoDeGasto, 'abierta' | 'id'> = {
  nombre: '',
  tipoPorOmision: 'bien',
  esProductoAgropecuario: false,
  esActivoFijo: false,
  activo: true,
};

/** La ventana abierta con los datos del concepto de gasto, o vacía si es nuevo. */
export function edicionDe(conceptoDeGasto?: ConceptoDeGasto): EdicionDeConceptoDeGasto {
  if (!conceptoDeGasto) return { abierta: true, id: null, ...CONCEPTO_DE_GASTO_NUEVO };
  return {
    abierta: true,
    id: conceptoDeGasto.id,
    nombre: textoDeEdicion(conceptoDeGasto.nombre),
    tipoPorOmision: conceptoDeGasto.tipoPorOmision,
    esProductoAgropecuario: conceptoDeGasto.esProductoAgropecuario,
    esActivoFijo: conceptoDeGasto.esActivoFijo,
    activo: conceptoDeGasto.activo,
  };
}

/** Lo que se manda al servidor: lo vacío como `null` y los números como números. */
export const datosDeConceptoDeGasto = (edicion: EdicionDeConceptoDeGasto): DatosConceptoDeGasto => ({
  nombre: edicion.nombre,
  tipoPorOmision: edicion.tipoPorOmision,
  esProductoAgropecuario: edicion.esProductoAgropecuario,
  esActivoFijo: edicion.esActivoFijo,
  activo: edicion.activo,
});
