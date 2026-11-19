import { reactive, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiSaldosIniciales } from '../../servicios/saldos-iniciales.api';
import type { SaldoInicialDeCuenta } from '../../servicios/tipos-de-saldos-iniciales';
import { avisoDeSubida, problemaDeLaEvidencia } from './evidencia-de-apertura';

/** Lo que la tarjeta de la evidencia necesita del composable (ya sin `.value`). */
export interface ControlDeEvidencia {
  enviando: boolean;
  error: string | undefined;
  direccion: string;
  subir: (archivo: File) => Promise<void>;
  quitar: () => Promise<void>;
}

interface Estado {
  enviando: Ref<boolean>;
  error: Ref<string | undefined>;
  exito: (mensaje: string) => void;
  alTerminar: () => Promise<void>;
}

/** Corre una acción sobre la evidencia, con un solo envío a la vez; al final vuelve a pedir la ficha. */
async function ejecutar(estado: Estado, accion: () => Promise<unknown>, aviso: string): Promise<void> {
  if (estado.enviando.value) return;
  estado.enviando.value = true;
  estado.error.value = undefined;
  try {
    await accion();
    estado.exito(aviso);
  } catch (causa) {
    estado.error.value = causa instanceof Error ? causa.message : 'Ocurrió un error inesperado.';
  } finally {
    await estado.alTerminar();
    estado.enviando.value = false;
  }
}

/** Sube, reemplaza y quita la evidencia de la apertura; al terminar vuelve a pedir la ficha de la cuenta. */
export function usarEvidenciaDeApertura(
  cuentaBancariaId: string,
  saldo: Ref<SaldoInicialDeCuenta | null>,
  alTerminar: () => Promise<void>,
): ControlDeEvidencia {
  const avisos = usarAvisos();
  const estado: Estado = { enviando: ref(false), error: ref<string>(), exito: avisos.exito, alTerminar };

  function subir(archivo: File): Promise<void> {
    estado.error.value = problemaDeLaEvidencia(archivo) ?? undefined;
    if (estado.error.value) return Promise.resolve();
    const exito = avisoDeSubida(saldo.value?.evidencia !== null);
    return ejecutar(estado, () => apiSaldosIniciales.subirEvidencia(cuentaBancariaId, archivo), exito);
  }

  async function quitar(): Promise<void> {
    const confirmado = await avisos.confirmar({
      mensaje: '¿Quitar la evidencia adjunta? Al cerrar la carga se le recordará que falta.',
      textoConfirmar: 'Quitar',
    });
    if (!confirmado) return;
    await ejecutar(estado, () => apiSaldosIniciales.quitarEvidencia(cuentaBancariaId), 'Evidencia quitada.');
  }

  const direccion = apiSaldosIniciales.direccionDeLaEvidencia(cuentaBancariaId);
  return reactive({ enviando: estado.enviando, error: estado.error, direccion, subir, quitar });
}
