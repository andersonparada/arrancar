import type { Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiConciliaciones, type Conciliacion } from '../../servicios/conciliaciones.api';

/** Guarda las marcas, termina y autoriza en el servidor; cada acción reemplaza el documento cargado. */
export function usarGuardadoDeConciliacion(conciliacion: Ref<Conciliacion | null>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();

  function guardarMarcas(marcados: ReadonlySet<string>): Promise<boolean> {
    const id = conciliacion.value?.id;
    if (!id) return Promise.resolve(false);
    return enviar(async () => (conciliacion.value = await apiConciliaciones.guardarMarcas(id, [...marcados])));
  }

  async function terminar(): Promise<void> {
    const id = conciliacion.value?.id;
    if (!id || !(await enviar(async () => (conciliacion.value = await apiConciliaciones.terminar(id))))) return;
    avisos.exito('Conciliación terminada: queda elaborada, a la espera de autorización.');
  }

  async function autorizar(): Promise<void> {
    const id = conciliacion.value?.id;
    if (!id || !(await enviar(async () => (conciliacion.value = await apiConciliaciones.autorizar(id))))) return;
    avisos.exito('Conciliación autorizada: el mes queda bloqueado.');
  }

  return { guardando: enviando, errores, guardarMarcas, terminar, autorizar };
}
