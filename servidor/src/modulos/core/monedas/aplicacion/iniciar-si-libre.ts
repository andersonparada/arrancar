import type { CerrojoDeCarga } from './puertos/cargas-de-tipos.js';

/**
 * Toma el cerrojo y deja el trabajo corriendo en segundo plano: responde en cuanto sabe si lo tomó, sin esperar a que
 * termine. Si el cerrojo estaba tomado devuelve `false` y no hace nada; si el trabajo falla, `alFallar` lo registra
 * (la carga ya dejó su constancia en la bitácora).
 */
export async function iniciarSiLibre(
  cerrojo: CerrojoDeCarga,
  trabajo: () => Promise<unknown>,
  alFallar: (error: unknown) => void,
): Promise<boolean> {
  let tomado!: (valor: boolean) => void;
  let fallo!: (error: unknown) => void;
  const arranque = new Promise<boolean>((resolver, rechazar) => {
    tomado = resolver;
    fallo = rechazar;
  });
  cerrojo
    .ejecutarSiLibre(async () => {
      tomado(true);
      await trabajo();
    })
    .then((corrio) => {
      if (corrio === null) tomado(false);
    })
    .catch((error: unknown) => {
      fallo(error);
      alFallar(error);
    });
  return arranque;
}
