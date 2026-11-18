import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiDatosDeEmpresa, type CargaInicial } from '../servicios/datos-de-empresa.api';
import { accionesDelBalance, problemaDelBalance } from './balance-de-apertura';

type Avisos = ReturnType<typeof usarAvisos>;

const confirmarReemplazo = (avisos: Avisos) =>
  avisos.confirmar({
    titulo: 'Reemplazar el balance de apertura',
    mensaje:
      'Se va a borrar el balance de apertura que está adjunto y se guardará el nuevo. El cambio queda registrado en la auditoría.',
    textoConfirmar: 'Reemplazar',
    peligroso: true,
  });

const confirmarQuitar = (avisos: Avisos) =>
  avisos.confirmar({
    titulo: 'Quitar el balance de apertura',
    mensaje:
      'Se va a borrar el balance de apertura adjunto. Podrá adjuntar otro cuando quiera. El cambio queda registrado en la auditoría.',
    textoConfirmar: 'Quitar balance',
    peligroso: true,
  });

/** Un cambio del balance: el error se queda a la vista junto al archivo, no en un aviso que se va. */
function usarCambioDelBalance(empresaId: () => string | null, carga: Ref<CargaInicial | null>) {
  const avisos = usarAvisos();
  const enviando = ref(false);
  const error = ref('');

  async function cambiar(accion: (id: string) => Promise<CargaInicial>, exito: string): Promise<void> {
    const id = empresaId();
    if (!id) return;
    [enviando.value, error.value] = [true, ''];
    try {
      carga.value = await accion(id);
      avisos.exito(exito);
    } catch (falla) {
      error.value = falla instanceof Error ? falla.message : 'No se pudo guardar el balance de apertura.';
    } finally {
      enviando.value = false;
    }
  }

  return { enviando, error, cambiar };
}

/** Lo que se ve del balance: qué se puede hacer con él, su dirección y la ventana del visor. */
function usarVisorDelBalance(empresaId: () => string | null, carga: Ref<CargaInicial | null>) {
  const visorAbierto = ref(false);
  const direccion = computed(() => {
    const id = empresaId();
    return id ? apiDatosDeEmpresa.direccionDelBalanceDeApertura(id) : '';
  });
  return {
    visorAbierto,
    direccion,
    acciones: computed(() => accionesDelBalance(carga.value)),
    abrirVisor: () => (visorAbierto.value = true),
    cerrarVisor: () => (visorAbierto.value = false),
  };
}

/** El balance de apertura firmado (PDF) de la empresa que se edita: subir, reemplazar, quitar y verlo. */
export function usarBalanceDeApertura(empresaId: () => string | null, carga: Ref<CargaInicial | null>) {
  const avisos = usarAvisos();
  const { enviando, error, cambiar } = usarCambioDelBalance(empresaId, carga);

  async function subir(archivo: File): Promise<void> {
    const problema = problemaDelBalance(archivo);
    if (problema) return void (error.value = problema);
    if (carga.value?.balanceDeApertura && !(await confirmarReemplazo(avisos))) return;
    await cambiar((id) => apiDatosDeEmpresa.subirBalanceDeApertura(id, archivo), 'Balance de apertura guardado.');
  }

  async function quitar(): Promise<void> {
    if (!(await confirmarQuitar(avisos))) return;
    await cambiar((id) => apiDatosDeEmpresa.quitarBalanceDeApertura(id), 'Balance de apertura quitado.');
  }

  return { enviando, error, subir, quitar, ...usarVisorDelBalance(empresaId, carga) };
}
