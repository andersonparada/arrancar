import type { Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiConciliaciones, type Conciliacion } from '../../servicios/conciliaciones.api';

/** Guarda las marcas, el saldo y el cierre en el servidor; cada acción reemplaza la conciliación cargada. */
export function usarGuardadoDeConciliacion(conciliacion: Ref<Conciliacion | null>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();

  function guardarMarcas(marcados: ReadonlySet<string>): Promise<boolean> {
    const id = conciliacion.value?.id;
    if (!id) return Promise.resolve(false);
    return enviar(async () => (conciliacion.value = await apiConciliaciones.guardarMarcas(id, [...marcados])));
  }

  function guardarSaldo(saldoSegunBanco: string): Promise<boolean> {
    const id = conciliacion.value?.id;
    if (!id) return Promise.resolve(false);
    return enviar(async () => (conciliacion.value = await apiConciliaciones.cambiarSaldo(id, saldoSegunBanco)));
  }

  async function cerrar(): Promise<void> {
    const id = conciliacion.value?.id;
    if (!id || !(await enviar(async () => (conciliacion.value = await apiConciliaciones.cerrar(id))))) return;
    avisos.exito('Conciliación cerrada.');
  }

  return { guardando: enviando, errores, guardarMarcas, guardarSaldo, cerrar };
}
