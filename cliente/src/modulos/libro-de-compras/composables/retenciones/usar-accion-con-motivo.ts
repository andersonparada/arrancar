import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarVentanaConMotivo } from '../libro/usar-ventana-con-motivo';

/**
 * Una acción que pide un motivo antes de hacerse (quitar una constancia, anular un pago). Guarda sobre qué objeto
 * se actúa; al terminar bien, cierra, avisa y vuelve a cargar lo que la pantalla muestre.
 */
export function usarAccionConMotivo<T>(
  accion: (objetivo: T, motivo: string) => Promise<unknown>,
  alTerminar: () => Promise<void>,
  textoDeExito: string,
) {
  const { abierta, motivo, enviando, errores, enviar, abrir } = usarVentanaConMotivo();
  const objetivo = ref<T | null>(null);

  async function guardar(): Promise<void> {
    const escrito = motivo.value.trim();
    const actual = objetivo.value;
    if (!escrito) errores.value = { motivo: 'Escriba el motivo.' };
    if (!escrito || actual === null) return;
    if (!(await enviar(() => accion(actual, escrito)))) return;
    abierta.value = false;
    usarAvisos().exito(textoDeExito);
    await alTerminar();
  }

  const abrirSobre = (nuevo: T) => {
    abrir();
    objetivo.value = nuevo;
  };
  return { abierta, objetivo, motivo, enviando, errores, abrir: abrirSobre, guardar };
}
