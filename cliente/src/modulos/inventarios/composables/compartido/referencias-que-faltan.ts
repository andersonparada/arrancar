import { computed } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';

/** Lo que los formularios de movimientos piden al servidor para llenar sus selectores, y el permiso que cada uno exige. */
const PERMISOS_DE_REFERENCIAS = {
  articulos: { permiso: 'inventarios.articulos.ver', texto: 'ver los artículos' },
  bodegas: { permiso: 'inventarios.bodegas.ver', texto: 'ver las bodegas' },
} as const;

export type Referencia = keyof typeof PERMISOS_DE_REFERENCIAS;

export const permisoParaVer = (referencia: Referencia): string => PERMISOS_DE_REFERENCIAS[referencia].permiso;

/**
 * El aviso de lo que le falta al usuario para llenar un formulario (sus selectores quedarían vacíos), o `null` si
 * tiene todo. Dice qué permiso pedir en vez de dejar al operador frente a listas vacías.
 */
export function avisoDeReferencias(
  puede: (permiso: string) => boolean,
  necesarias: readonly Referencia[],
): string | null {
  const faltan = necesarias.filter((referencia) => !puede(permisoParaVer(referencia)));
  if (!faltan.length) return null;
  const textos = faltan.map((referencia) => PERMISOS_DE_REFERENCIAS[referencia].texto).join(' y ');
  return `No puede completar este formulario: le falta el permiso para ${textos}, y sin él no hay qué elegir. Pida a quien administra los accesos que se lo dé.`;
}

/** El aviso de lo que falta para llenar los selectores de artículos y bodegas de un movimiento. */
export function usarAvisoDeReferencias() {
  const sesion = usarSesion();
  return computed(() => avisoDeReferencias(sesion.puede, ['articulos', 'bodegas']));
}
