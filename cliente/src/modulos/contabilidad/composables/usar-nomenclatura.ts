import { computed, ref, type ComputedRef } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiCuentas, type Cuenta } from '../servicios/cuentas.api';
import { apiEnlaces, type RolDeEnlace } from '../servicios/enlaces.api';
import { apiInicio, type InicioContable } from '../servicios/inicio.api';
import { armarArbol, filasVisibles, idsConHijas, type NodoDeCuenta } from './arbol-de-cuentas';
import { usarEdicionDeCuenta } from './usar-edicion-de-cuenta';

interface Datos {
  inicio: InicioContable | null;
  cuentas: Cuenta[];
  roles: RolDeEnlace[];
}

/** Los roles solo sirven para avisar al quitar la marca de control; si no se pueden leer, no estorban. */
async function rolesSiPuede(puede: boolean): Promise<RolDeEnlace[]> {
  if (!puede) return [];
  return apiEnlaces.listar().catch(() => []);
}

async function traerTodo(puedeVerEnlaces: boolean): Promise<Datos> {
  const inicio = await apiInicio.obtener();
  const [cuentas, roles] = await Promise.all([
    inicio ? apiCuentas.listar() : Promise.resolve([]),
    rolesSiPuede(puedeVerEnlaces),
  ]);
  return { inicio, cuentas, roles };
}

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
  const { datos, cargando, cargar } = usarCarga<Datos>(
    () => traerTodo(sesion.puede('contabilidad.enlaces.ver')),
    { inicio: null, cuentas: [], roles: [] },
    'No se pudo traer la nomenclatura.',
  );
  const cuentas = computed(() => datos.value.cuentas);
  const roles = computed(() => datos.value.roles);
  const mascara = computed(() => datos.value.inicio?.mascara ?? '');
  const vista = usarVistaDelArbol(computed(() => armarArbol(cuentas.value)));

  async function alGuardar(padreId: string | null): Promise<void> {
    if (padreId) vista.abrirCamino(padreId);
    await cargar();
  }

  const edicion = usarEdicionDeCuenta({ cuentas, mascara, roles, alGuardar });
  const intercambio = usarIntercambio(apiCuentas.intercambio, cargar);
  return { inicio: computed(() => datos.value.inicio), mascara, cuentas, cargando, intercambio, ...vista, ...edicion };
}
