import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiMejoras, type Mejora } from '../../servicios/mejoras.api';
import { mensajeDeAnulacionDeMejora } from './edicion-de-mejora';

/** La ventana de motivo para anular una mejora: qué se anula y qué pasará con la depreciación. */
export function usarAnulacionDeMejora(
  formulario: {
    errores: Ref<Record<string, string>>;
    enviar: (accion: () => Promise<unknown>) => Promise<boolean>;
  },
  alAnular: () => Promise<void>,
) {
  const avisos = usarAvisos();
  const porAnular = ref<Mejora | null>(null);
  const motivo = ref('');
  const texto = computed(() => (porAnular.value ? mensajeDeAnulacionDeMejora(porAnular.value) : ''));

  function pedir(mejora: Mejora): void {
    motivo.value = '';
    formulario.errores.value = {};
    porAnular.value = mejora;
  }

  async function confirmar(): Promise<void> {
    const mejora = porAnular.value;
    if (!mejora || !(await formulario.enviar(() => apiMejoras.anular(mejora.id, motivo.value.trim())))) return;
    porAnular.value = null;
    avisos.exito('Anulada. La depreciación volvió a los tramos anteriores.');
    await alAnular();
  }

  return { porAnular, motivo, texto, pedir, confirmar, cerrar: () => (porAnular.value = null) };
}
