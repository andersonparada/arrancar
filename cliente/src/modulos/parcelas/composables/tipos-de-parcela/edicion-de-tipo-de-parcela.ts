import { textoDeEdicion } from '@/modulos/core/utilidades/edicion';
import type { DatosTipoDeParcela, TipoDeParcela } from '../../servicios/tipos-de-parcela.api';

/** Lo que muestra cada campo de la ventana mientras se edita un tipo de parcela. */
export interface EdicionDeTipoDeParcela {
  abierta: boolean;
  id: string | null;
  nombre: string;
  activo: boolean;
}

const TIPO_DE_PARCELA_NUEVO: Omit<EdicionDeTipoDeParcela, 'abierta' | 'id'> = {
  nombre: '',
  activo: true,
};

/** La ventana abierta con los datos del tipo de parcela, o vacía si es nuevo. */
export function edicionDe(tipoDeParcela?: TipoDeParcela): EdicionDeTipoDeParcela {
  if (!tipoDeParcela) return { abierta: true, id: null, ...TIPO_DE_PARCELA_NUEVO };
  return {
    abierta: true,
    id: tipoDeParcela.id,
    nombre: textoDeEdicion(tipoDeParcela.nombre),
    activo: tipoDeParcela.activo,
  };
}

/** Lo que se manda al servidor: lo vacío como `null` y los números como números. */
export const datosDeTipoDeParcela = (edicion: EdicionDeTipoDeParcela): DatosTipoDeParcela => ({
  nombre: edicion.nombre,
  activo: edicion.activo,
});
