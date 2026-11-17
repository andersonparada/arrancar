import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import { apiConciliaciones, type Conciliacion } from '../../servicios/conciliaciones.api';
import { estaDesactualizada, problemaDelArchivo } from './estado-de-cuenta';

interface Contexto {
  conciliacion: Ref<Conciliacion | null>;
  enviando: Ref<boolean>;
  error: Ref<string | undefined>;
  exito: (mensaje: string) => void;
}

/** Si el servidor dice que ya no está en proceso, vuelve a pedirla para que la pantalla refleje la realidad. */
async function alFallar(contexto: Contexto, causa: unknown, id: string): Promise<void> {
  const mensaje = causa instanceof Error ? causa.message : 'Ocurrió un error inesperado.';
  if (causa instanceof ErrorApi && estaDesactualizada(causa.codigo)) {
    contexto.conciliacion.value = await apiConciliaciones.obtener(id).catch(() => contexto.conciliacion.value);
    contexto.error.value = `${mensaje} Se actualizó la pantalla con lo que hay ahora.`;
    return;
  }
  contexto.error.value = mensaje;
}

async function ejecutar(contexto: Contexto, accion: (id: string) => Promise<Conciliacion>, exito: string) {
  const id = contexto.conciliacion.value?.id;
  if (!id || contexto.enviando.value) return;
  contexto.enviando.value = true;
  contexto.error.value = undefined;
  try {
    contexto.conciliacion.value = await accion(id);
    contexto.exito(exito);
  } catch (causa) {
    await alFallar(contexto, causa, id);
  } finally {
    contexto.enviando.value = false;
  }
}

/** Sube, reemplaza y quita el estado de cuenta; cada acción reemplaza la conciliación cargada. */
export function usarEstadoDeCuenta(conciliacion: Ref<Conciliacion | null>) {
  const avisos = usarAvisos();
  const enviando = ref(false);
  const error = ref<string>();
  const contexto: Contexto = { conciliacion, enviando, error, exito: avisos.exito };
  const direccion = computed(() =>
    conciliacion.value ? apiConciliaciones.direccionDelEstadoDeCuenta(conciliacion.value.id) : '',
  );

  function subir(archivo: File): Promise<void> {
    error.value = problemaDelArchivo(archivo) ?? undefined;
    if (error.value) return Promise.resolve();
    const reemplaza = conciliacion.value?.estadoDeCuenta !== null;
    const exito = reemplaza ? 'Estado de cuenta reemplazado.' : 'Estado de cuenta adjuntado.';
    return ejecutar(contexto, (id) => apiConciliaciones.subirEstadoDeCuenta(id, archivo), exito);
  }

  async function quitar(): Promise<void> {
    const confirmado = await avisos.confirmar({
      mensaje: '¿Quitar el estado de cuenta adjunto? Tendrá que subirlo de nuevo antes de terminar la conciliación.',
      textoConfirmar: 'Quitar',
    });
    if (!confirmado) return;
    await ejecutar(contexto, (id) => apiConciliaciones.quitarEstadoDeCuenta(id), 'Estado de cuenta quitado.');
  }

  return { enviando, error, direccion, subir, quitar };
}
