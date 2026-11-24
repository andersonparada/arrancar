import { computed, ref, type ComputedRef } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiCuentas } from '../servicios/cuentas.api';
import { armarArbol, filasVisibles, idsConHijas, type NodoDeCuenta } from './arbol-de-cuentas';
import { marcarFalloDeCarga } from './marcar-fallo-de-carga';
import { traerNomenclatura, type DatosDeNomenclatura } from './traer-nomenclatura';
import { usarEdicionDeCuenta } from './usar-edicion-de-cuenta';

/** Qué ramas del árbol están abiertas, la búsqueda y las filas que de ahí salen. */
function usarVistaDelArbol(arbol: ComputedRef<NodoDeCuenta[]>) {
  const abiertos = ref(new Set<string>());
  const texto = ref('');
  const conInactivas = ref(true);
  const filas = computed(() =>
    filasVisibles(arbol.value, abiertos.value, { texto: texto.value, conInactivas: conInactivas.value }),
  );

  function alternar(id: string): void {
    const nuevos = new Set(abiertos.value);
    if (!nuevos.delete(id)) nuevos.add(id);
    abiertos.value = nuevos;
  }

  const abrirCamino = (id: string) => (abiertos.value = new Set(abiertos.value).add(id));
  const expandirTodo = () => (abiertos.value = new Set(idsConHijas(arbol.value)));
  const plegarTodo = () => (abiertos.value = new Set());
  return { filas, texto, conInactivas, alternar, abrirCamino, expandirTodo, plegarTodo };
}

/** La nomenclatura: el árbol de cuentas con su búsqueda, lo plegado y la ventana de edición. */
export function usarNomenclatura() {
  const sesion = usarSesion();
  const fallo = ref(false);
  const { datos, cargando, cargar } = usarCarga<DatosDeNomenclatura>(
    marcarFalloDeCarga(() => traerNomenclatura(sesion.puede('contabilidad.enlaces.ver')), fallo),
    { mascara: null, cuentas: [], roles: [] },
    'No se pudo traer la nomenclatura.',
  );
  const cuentas = computed(() => datos.value.cuentas);
  const roles = computed(() => datos.value.roles);
  const mascara = computed(() => datos.value.mascara ?? '');
  const iniciada = computed(() => datos.value.mascara !== null);
  const vista = usarVistaDelArbol(computed(() => armarArbol(cuentas.value)));

  async function alGuardar(padreId: string | null): Promise<void> {
    if (padreId) vista.abrirCamino(padreId);
    await cargar();
  }

  const edicion = usarEdicionDeCuenta({ cuentas, mascara, roles, alGuardar });
  const intercambio = usarIntercambio(apiCuentas.intercambio, cargar);
  return { iniciada, fallo, cargar, mascara, cuentas, cargando, intercambio, ...vista, ...edicion };
}
