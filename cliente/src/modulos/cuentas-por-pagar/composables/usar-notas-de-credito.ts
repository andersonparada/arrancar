import { computed, onMounted, reactive, ref, watch } from 'vue';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { DOCUMENTOS_POR_PAGINA, paginasEnTotal } from './filtros-de-documentos';
import {
  consultaDeNotas,
  filtrosInicialesDeNotas,
  saldosAFavorPorProveedor,
  type FiltrosDeNotas,
} from './notas-de-credito';
import { usarPeticionDeDocumentos, usarProveedoresDelFiltro } from './usar-lista-de-documentos';

/** La pantalla «Notas de crédito»: filtros, página y el saldo a favor por proveedor de lo que se ve. */
export function usarNotasDeCredito() {
  const filtros = reactive<FiltrosDeNotas>(filtrosInicialesDeNotas());
  const pagina = ref(1);
  const { documentos, total, cargando, cargar } = usarPeticionDeDocumentos(() =>
    consultaDeNotas(filtros, pagina.value),
  );

  // Cambiar un filtro vuelve a la primera página; si ya estaba en ella, recarga directo.
  alDejarDeEscribir(filtros, () => (pagina.value === 1 ? cargar() : (pagina.value = 1)));
  watch(pagina, cargar);
  onMounted(cargar);

  return {
    notas: documentos,
    total,
    pagina,
    cargando,
    filtros,
    proveedores: usarProveedoresDelFiltro(),
    paginas: computed(() => paginasEnTotal(total.value, DOCUMENTOS_POR_PAGINA)),
    limite: DOCUMENTOS_POR_PAGINA,
    quitarFiltros: () => Object.assign(filtros, filtrosInicialesDeNotas()),
    /** Solo se calcula con todas las notas a la vista: sumar una página dejaría saldos falsos. */
    saldosPorProveedor: computed(() =>
      total.value <= documentos.value.length ? saldosAFavorPorProveedor(documentos.value) : [],
    ),
  };
}
