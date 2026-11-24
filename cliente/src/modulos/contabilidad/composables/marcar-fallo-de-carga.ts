import type { Ref } from 'vue';

/**
 * Envuelve lo que trae una pantalla para saber si falló: `usarCarga` avisa y conserva los datos de antes, pero la
 * pantalla necesita distinguir «no se pudo traer» de «todavía no existe» para no ofrecer un formulario vacío.
 */
export function marcarFalloDeCarga<T>(obtener: () => Promise<T>, fallo: Ref<boolean>): () => Promise<T> {
  return async () => {
    fallo.value = false;
    try {
      return await obtener();
    } catch (error) {
      fallo.value = true;
      throw error;
    }
  };
}
