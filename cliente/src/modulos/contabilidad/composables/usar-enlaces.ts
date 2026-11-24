import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiCuentas, type Cuenta } from '../servicios/cuentas.api';
import { apiEnlaces, type RolDeEnlace } from '../servicios/enlaces.api';
import {
  agruparPorModulo,
  consecuenciaDeQuitar,
  cuentasEnlazables,
  faltantesDelRol,
  totalDeFaltantes,
  type FilaDeEnlace,
  type LlavesDelRol,
} from './edicion-de-enlaces';
import { marcarFalloDeCarga } from './marcar-fallo-de-carga';

interface Datos {
  roles: RolDeEnlace[];
  cuentas: Cuenta[];
  /** `null` = no se pudieron traer los registros de ese rol. */
  llaves: Record<string, LlavesDelRol>;
}

type Avisos = ReturnType<typeof usarAvisos>;

/** Las cuentas solo se ofrecen a quien puede verlas; sin ellas la pantalla se ve pero no se elige nada. */
const cuentasSiPuede = (puede: boolean): Promise<Cuenta[]> => (puede ? apiCuentas.listar() : Promise.resolve([]));

/** Los registros que ofrece cada módulo para los roles con llave; si uno falla, queda en `null` para no confundirlo con «ninguno». */
async function llavesDe(roles: RolDeEnlace[]): Promise<Record<string, LlavesDelRol>> {
  const conLlave = roles.filter((rol) => rol.admiteLlave);
  const listas = await Promise.all(conLlave.map((rol) => apiEnlaces.llaves(rol.rol).catch(() => null)));
  return Object.fromEntries(conLlave.map((rol, posicion) => [rol.rol, listas[posicion] ?? null]));
}

async function traerTodo(puedeVerCuentas: boolean): Promise<Datos> {
  const roles = await apiEnlaces.listar();
  const [cuentas, llaves] = await Promise.all([cuentasSiPuede(puedeVerCuentas), llavesDe(roles)]);
  return { roles, cuentas, llaves };
}

function mensajeDeEnlazado(rol: RolDeEnlace, cuenta: Cuenta): string {
  const base = `Enlazado con ${cuenta.codigo} ${cuenta.nombre}.`;
  return rol.esDeAuxiliar && !cuenta.esDeControl ? `${base} La cuenta quedó marcada como cuenta de control.` : base;
}

const confirmarCambio = (avisos: Avisos, fila: FilaDeEnlace, nueva: Cuenta): Promise<boolean> =>
  avisos.confirmar({
    titulo: 'Cambiar la cuenta',
    mensaje: `«${fila.nombre}» pasará de ${fila.enlace?.cuentaCodigo} ${fila.enlace?.cuentaNombre} a ${nueva.codigo} ${nueva.nombre}. Solo afecta a lo que se contabilice desde ahora; lo ya contabilizado no cambia, salvo que regenere un período abierto: ahí las partidas automáticas se rehacen con la cuenta nueva.`,
    textoConfirmar: 'Cambiar',
  });

const confirmarQuitar = (avisos: Avisos, rol: RolDeEnlace, fila: FilaDeEnlace): Promise<boolean> =>
  avisos.confirmar({
    titulo: 'Quitar el enlace',
    mensaje: `«${fila.nombre}» dejará de usar ${fila.enlace?.cuentaCodigo} ${fila.enlace?.cuentaNombre}. ${consecuenciaDeQuitar(rol, fila)}`,
    textoConfirmar: 'Quitar',
    peligroso: true,
  });

/** Corre una acción sobre una fila: la deja ocupada, avisa el resultado y trae de nuevo los roles al terminar. */
function usarAccionSobreLaFila(datos: Ref<Datos>) {
  const avisos = usarAvisos();
  const ocupadas = ref(new Set<string>());

  async function sobreLaFila(rol: RolDeEnlace, fila: FilaDeEnlace, accion: () => Promise<string>): Promise<void> {
    const clave = `${rol.rol}|${fila.llave ?? ''}`;
    ocupadas.value = new Set(ocupadas.value).add(clave);
    try {
      avisos.exito(await accion());
      datos.value = { ...datos.value, roles: await apiEnlaces.listar() };
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo guardar el enlace.');
    } finally {
      ocupadas.value = new Set([...ocupadas.value].filter((otra) => otra !== clave));
    }
  }

  return { avisos, ocupadas, sobreLaFila };
}

/** Elegir, cambiar o quitar la cuenta de una fila, con la confirmación que pide cada caso. */
function usarCambiosDeEnlace(datos: Ref<Datos>, cuentas: ComputedRef<Cuenta[]>) {
  const { avisos, ocupadas, sobreLaFila } = usarAccionSobreLaFila(datos);

  async function elegir(rol: RolDeEnlace, fila: FilaDeEnlace, cuentaId: string): Promise<void> {
    const cuenta = cuentas.value.find((c) => c.id === cuentaId);
    if (!cuenta || cuentaId === fila.enlace?.cuentaId) return;
    if (fila.enlace && !(await confirmarCambio(avisos, fila, cuenta))) return;
    await sobreLaFila(rol, fila, async () => {
      await apiEnlaces.guardar(rol.rol, { llave: fila.llave, cuentaId });
      return mensajeDeEnlazado(rol, cuenta);
    });
  }

  async function quitar(rol: RolDeEnlace, fila: FilaDeEnlace): Promise<void> {
    const enlace = fila.enlace;
    if (!enlace || !(await confirmarQuitar(avisos, rol, fila))) return;
    await sobreLaFila(rol, fila, async () => {
      await apiEnlaces.quitar(enlace.id);
      return 'Enlace quitado.';
    });
  }

  return { ocupadas, elegir, quitar };
}

/** Los enlaces contables: roles por módulo, lo que falta y elegir, cambiar o quitar la cuenta de cada fila. */
export function usarEnlaces(puedeVerCuentas: boolean) {
  const soloFaltantes = ref(false);
  const fallo = ref(false);
  const { datos, cargando, cargar } = usarCarga<Datos>(
    marcarFalloDeCarga(() => traerTodo(puedeVerCuentas), fallo),
    { roles: [], cuentas: [], llaves: {} },
    'No se pudieron traer los enlaces.',
  );
  const faltantes = computed(() => totalDeFaltantes(datos.value.roles, datos.value.llaves));
  const cuentas = computed(() => cuentasEnlazables(datos.value.cuentas));
  const grupos = computed(() => {
    const conFalta = (rol: RolDeEnlace) => faltantesDelRol(rol, datos.value.llaves[rol.rol] ?? null) > 0;
    return agruparPorModulo(datos.value.roles.filter((rol) => !soloFaltantes.value || conFalta(rol)));
  });
  const cambios = usarCambiosDeEnlace(datos, cuentas);
  const intercambio = usarIntercambio(apiEnlaces.intercambio, cargar);
  return { grupos, faltantes, cuentas, cargando, fallo, cargar, soloFaltantes, datos, intercambio, ...cambios };
}
