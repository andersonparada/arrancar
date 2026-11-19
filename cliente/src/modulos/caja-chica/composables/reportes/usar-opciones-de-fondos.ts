import { computed, onMounted, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import { apiFondos } from '../../servicios/fondos.api';

/** Los fondos que el usuario ve (abiertos y cerrados), para que un reporte se limite a uno. */
export function usarOpcionesDeFondos() {
  const avisos = usarAvisos();
  const fondos = ref<Array<{ id: string; nombre: string }>>([]);

  onMounted(async () => {
    try {
      fondos.value = (await apiFondos.listar({ estado: 'todos' })).elementos;
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo cargar la lista de fondos.');
    }
  });

  const opciones = computed<OpcionBuscable<string>[]>(() => [
    { valor: '', texto: 'Todos los fondos' },
    ...fondos.value.map((fondo) => ({ valor: fondo.id, texto: fondo.nombre })),
  ]);
  const nombreDe = (id: string): string | undefined => fondos.value.find((fondo) => fondo.id === id)?.nombre;
  return { opciones, nombreDe };
}
