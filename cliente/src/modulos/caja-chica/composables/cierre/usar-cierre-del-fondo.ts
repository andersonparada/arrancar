import type { Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiFondos } from '../../servicios/fondos.api';
import type { Fondo } from '../../servicios/tipos-de-fondos';
import { usarVentanaDeAccion } from '../usar-ventana-de-accion';
import { cuerpoDeCierre, edicionDeCierre, faltaDelCierre } from './edicion-de-cierre';

/**
 * Cerrar el fondo: pide el motivo y la cuenta del depósito, y al terminar muestra los avisos de Bancos y recarga la ficha
 * (el fondo queda cerrado y sus acciones desaparecen).
 */
export function usarCierreDelFondo(
  fondo: Ref<Fondo | null>,
  contexto: { recargar: () => Promise<unknown>; alAbrir: () => void | Promise<void> },
) {
  const avisos = usarAvisos();
  return usarVentanaDeAccion({
    inicial: () => edicionDeCierre(fondo.value?.cuentaBancariaId ?? null),
    validar: (edicion) => faltaDelCierre(edicion, fondo.value?.efectivoEsperado ?? '0'),
    alAbrir: contexto.alAbrir,
    enviar: (edicion) => apiFondos.cerrar(fondo.value?.id ?? '', cuerpoDeCierre(edicion)),
    exito: (cerrado) => `Fondo «${cerrado.nombre}» cerrado.`,
    alTerminar: async (cerrado) => {
      cerrado.avisos.forEach((aviso) => avisos.info(aviso));
      await contexto.recargar();
    },
  });
}
