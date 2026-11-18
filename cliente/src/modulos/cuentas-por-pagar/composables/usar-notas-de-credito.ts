import { computed, onMounted, reactive, ref, watch, type Ref } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import type { DocumentoPorPagar } from '../servicios/tipos';
import { DOCUMENTOS_POR_PAGINA, paginasEnTotal } from './filtros-de-documentos';
import {
  consultaDeNotas,
  filtrosInicialesDeNotas,
  saldosAFavorPorProveedor,
  type FiltrosDeNotas,
} from './notas-de-credito';
import { esDelMismoProveedor } from './reintegros/reintegro';
import { usarReintegro } from './reintegros/usar-reintegro';
import { usarPeticionDeDocumentos, usarProveedoresDelFiltro } from './usar-lista-de-documentos';
import { usarSeleccion } from './usar-seleccion';

const PERMISO_DE_REINTEGRAR = 'cuentas-por-pagar.reintegros.crear';

/** Marcar notas del mismo proveedor y registrar su reintegro: solo se marca lo que el servidor dice que se puede. */
function usarReintegroDeNotas(notas: Ref<DocumentoPorPagar[]>) {
  const puedeReintegrar = usarSesion().puede(PERMISO_DE_REINTEGRAR);
  const marcables = computed(() => notas.value.filter((nota) => puedeReintegrar && nota.puedeReintegrar));
  const seleccion = usarSeleccion(computed(() => marcables.value.map(({ id }) => id)));
  const escogidas = computed(() => marcables.value.filter((nota) => seleccion.seleccion.value.includes(nota.id)));
  const reintegro = usarReintegro();
  return {
    ...seleccion,
    reintegro,
    puedeReintegrar,
    /** Una nota se marca si se puede reintegrar y es del proveedor de las ya marcadas. */
    sePuedeMarcar: (nota: DocumentoPorPagar): boolean =>
      puedeReintegrar && nota.puedeReintegrar && esDelMismoProveedor(escogidas.value, nota),
    reintegrarEscogidas: () => reintegro.abrir(escogidas.value),
  };
}

/** La pantalla «Notas de crédito»: filtros, página, el saldo a favor por proveedor y el reintegro de las notas marcadas. */
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
    ...usarReintegroDeNotas(documentos),
  };
}
