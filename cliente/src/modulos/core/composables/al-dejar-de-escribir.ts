import { watch, type WatchSource } from 'vue';

const PAUSA_AL_ESCRIBIR = 300;

/** Ejecuta la acción cuando el usuario deja de escribir, no con cada tecla. */
export function alDejarDeEscribir(fuente: WatchSource | object, accion: () => unknown): void {
  let espera: ReturnType<typeof setTimeout> | undefined;
  watch(
    fuente,
    () => {
      clearTimeout(espera);
      espera = setTimeout(accion, PAUSA_AL_ESCRIBIR);
    },
    { deep: true },
  );
}
