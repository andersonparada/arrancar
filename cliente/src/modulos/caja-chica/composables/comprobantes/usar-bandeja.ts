import { computed, ref, watch, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiComprobantes } from '../../servicios/comprobantes.api';
import { apiFondos } from '../../servicios/fondos.api';
import type { ComprobanteDeLaBandeja, FiltroDeBandeja } from '../../servicios/tipos-de-comprobantes';
import type { PaginaDeFondos } from '../../servicios/tipos-de-fondos';
import { sePuedeMarcar } from './armado-de-asignacion';
import { cantidadDeFiltros, filtrarBandeja, proveedoresDeLaBandeja } from './detalles-de-comprobante';
import { usarAsignacion } from './usar-asignacion';

/** Lo máximo que el servidor asigna en una sola vez. */
export const MAXIMO_POR_ASIGNACION = 100;

/** Los filtros y lo que dejan ver; la bandeja se trae completa y así las opciones del filtro no se encogen. */
function usarFiltros(documentos: Ref<ComprobanteDeLaBandeja[]>) {
  const filtro = ref<FiltroDeBandeja>({});
  return {
    filtro,
    visibles: computed(() => filtrarBandeja(documentos.value, filtro.value)),
    filtros: computed(() => cantidadDeFiltros(filtro.value)),
    proveedores: computed(() => proveedoresDeLaBandeja(documentos.value)),
    limpiarFiltros: () => (filtro.value = {}),
  };
}

/** Qué documentos están marcados; lo que un filtro esconde se desmarca: no se asigna nada que no se esté viendo. */
function usarSeleccion(visibles: Ref<ComprobanteDeLaBandeja[]>) {
  const seleccion = ref<string[]>([]);
  const marcados = computed(() => visibles.value.filter((d) => seleccion.value.includes(d.id)));
  const marcables = computed(() => visibles.value.filter(sePuedeMarcar).slice(0, MAXIMO_POR_ASIGNACION));
  const todosMarcados = computed(
    () => marcables.value.length > 0 && marcables.value.every((d) => seleccion.value.includes(d.id)),
  );
  watch(visibles, (lista) => (seleccion.value = seleccion.value.filter((id) => lista.some((d) => d.id === id))));
  return {
    seleccion,
    marcados,
    todosMarcados,
    alternar: (id: string) => {
      const ya = seleccion.value.includes(id);
      seleccion.value = ya ? seleccion.value.filter((x) => x !== id) : [...seleccion.value, id];
    },
    alternarTodos: () => (seleccion.value = todosMarcados.value ? [] : marcables.value.map((d) => d.id)),
  };
}

/** Los fondos abiertos y el elegido; el que llega en la ruta («Desde la bandeja» de su ficha) queda elegido. */
function usarFondoDeDestino() {
  const fondos = usarCarga(
    () => apiFondos.listar({ estado: 'abierto' }),
    { elementos: [], total: 0 } as PaginaDeFondos,
    'No se pudieron cargar los fondos.',
  );
  const fondoId = ref<string | null>(null);
  const deLaRuta = String(useRoute().query.fondo ?? '');
  watch(fondos.datos, ({ elementos }) => {
    if (!fondoId.value && elementos.some((f) => f.id === deLaRuta)) fondoId.value = deLaRuta;
  });
  const elegido = computed(() => fondos.datos.value.elementos.find((f) => f.id === fondoId.value) ?? null);
  return { fondos: fondos.datos, fondoId, fondoElegido: elegido };
}

/** Pide la confirmación de asignar lo marcado al fondo elegido; sin fondo elegido no hace nada. */
function asignarMarcados(
  marcados: ComprobanteDeLaBandeja[],
  fondo: { id: string; nombre: string } | null,
  asignacion: ReturnType<typeof usarAsignacion>,
): void {
  if (fondo) asignacion.pedir(marcados, fondo);
}

/** La bandeja de Caja chica: filtrar, marcar documentos y asignarlos a un fondo abierto en un solo paso. */
export function usarBandeja() {
  const bandeja = usarCarga(
    () => apiComprobantes.bandeja(),
    [] as ComprobanteDeLaBandeja[],
    'No se pudo cargar la bandeja.',
  );
  const filtros = usarFiltros(bandeja.datos);
  const seleccion = usarSeleccion(filtros.visibles);
  const destino = usarFondoDeDestino();
  const asignacion = usarAsignacion(async () => {
    seleccion.seleccion.value = [];
    await bandeja.cargar();
  });

  return {
    cargando: bandeja.cargando,
    total: computed(() => bandeja.datos.value.length),
    ...filtros,
    ...seleccion,
    ...destino,
    asignacion,
    asignar: () => asignarMarcados(seleccion.marcados.value, destino.fondoElegido.value, asignacion),
  };
}
