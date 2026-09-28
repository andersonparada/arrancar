import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { DatosBanco, Banco } from '../../servicios/bancos.api';

/** Lo que muestra cada campo de la ventana mientras se edita un banco. */
export interface EdicionDeBanco {
  abierta: boolean;
  id: string | null;
  nombre: string;
  observaciones: string;
  activo: boolean;
}

const BANCO_NUEVO: Omit<EdicionDeBanco, 'abierta' | 'id'> = {
  nombre: '',
  observaciones: '',
  activo: true,
};

/** La ventana abierta con los datos del banco, o vacía si es nuevo. */
export function edicionDe(banco?: Banco): EdicionDeBanco {
  if (!banco) return { abierta: true, id: null, ...BANCO_NUEVO };
  return {
    abierta: true,
    id: banco.id,
    nombre: textoDeEdicion(banco.nombre),
    observaciones: textoDeEdicion(banco.observaciones),
    activo: banco.activo,
  };
}

/** Lo que se manda al servidor: lo vacío como `null` y los números como números. */
export const datosDeBanco = (edicion: EdicionDeBanco): DatosBanco => ({
  nombre: edicion.nombre,
  observaciones: textoONulo(edicion.observaciones),
  activo: edicion.activo,
});
