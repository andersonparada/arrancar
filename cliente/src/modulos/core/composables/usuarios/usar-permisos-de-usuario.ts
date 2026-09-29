import { computed, ref, watch } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { usarSesion } from '../../almacenes/sesion';
import { apiRoles } from '../../servicios/roles.api';
import { apiUsuarios } from '../../servicios/usuarios.api';
import { usarCarga } from '../usar-carga';
import { usarFormulario } from '../usar-formulario';
import {
  catalogoDesdeEfectivos,
  daAccesoTotal,
  edicionDePermisos,
  gruposConOrigen,
  hayCambios,
  marcarGrupo,
  resumenDeCambios,
  rolesDesdeEfectivos,
  rolConAccesoTotal,
  soloLosQueTiene as filtrarLosQueTiene,
  solicitudDePermisos,
  totalDePermisos,
  type EdicionDePermisos,
  type GrupoConOrigen,
} from './permisos-de-usuario';

/** Quien no puede ver los roles ni el catálogo (`roles.ver`) igual ve los permisos que tiene el usuario. */
const traerTodo = (usuarioId: string) => async () => {
  const [usuarios, permisos, roles, catalogo] = await Promise.all([
    apiUsuarios.listar(),
    apiUsuarios.permisosDe(usuarioId),
    apiRoles.listar().catch(() => []),
    apiRoles.catalogoPermisos().catch(() => []),
  ]);
  return { usuario: usuarios.find((u) => u.id === usuarioId) ?? null, permisos, roles, catalogo };
};

type DatosDePermisos = Awaited<ReturnType<ReturnType<typeof traerTodo>>>;

/** Sin el catálogo, se arma con lo que el servidor dice que el usuario tiene. */
function catalogoDe(datos: DatosDePermisos | null) {
  if (!datos) return [];
  if (datos.catalogo.length) return datos.catalogo;
  return catalogoDesdeEfectivos(datos.permisos);
}

/** Sin la lista de roles (`roles.ver`), sus permisos se reconstruyen con el origen que dio el servidor. */
const rolesDe = (datos: DatosDePermisos | null) =>
  datos?.roles.length ? datos.roles : datos ? rolesDesdeEfectivos(datos.permisos) : [];

/** Confirma con un resumen de lo que va a pasar, guarda y vuelve a pedir lo guardado. */
function usarGuardadoDePermisos(usuarioId: string, base: ReturnType<typeof usarEdicionDePermisos>) {
  const avisos = usarAvisos();
  const { enviando, enviar } = usarFormulario();

  async function guardar(): Promise<void> {
    const { inicial, edicion, roles } = base;
    const confirmado = await avisos.confirmar({
      titulo: 'Guardar roles y permisos',
      mensaje: resumenDeCambios(inicial.value, edicion.value, roles.value),
      textoConfirmar: 'Guardar',
      peligroso: daAccesoTotal(inicial.value, edicion.value, roles.value),
    });
    if (!confirmado) return;
    if (!(await enviar(() => apiUsuarios.asignarPermisos(usuarioId, solicitudDePermisos(edicion.value))))) return;
    avisos.exito('Roles y permisos guardados.');
    await base.cargar();
  }

  return { enviando, guardar };
}

/** Los datos del usuario y lo que se edita en la página, con lo que se calcula de ellos. */
function usarEdicionDePermisos(usuarioId: string) {
  const { datos, cargando, cargar } = usarCarga<DatosDePermisos | null>(
    traerTodo(usuarioId),
    null,
    'No se pudieron cargar los permisos.',
  );
  const edicion = ref<EdicionDePermisos>({ rolIds: [], directos: [] });
  const inicial = ref<EdicionDePermisos>({ rolIds: [], directos: [] });
  const soloLosQueTiene = ref(false);

  watch(datos, (nuevos) => {
    if (!nuevos) return;
    inicial.value = edicionDePermisos(nuevos.permisos);
    edicion.value = edicionDePermisos(nuevos.permisos);
  });

  const roles = computed(() => rolesDe(datos.value));
  const inactivos = computed(
    () => new Set((datos.value?.permisos.efectivos ?? []).filter((p) => !p.moduloActivo).map((p) => p.modulo)),
  );
  const vista = computed(() => ({ roles: roles.value, edicion: edicion.value, inactivos: inactivos.value }));
  const todos = computed(() => gruposConOrigen(catalogoDe(datos.value), vista.value));
  const grupos = computed(() => (soloLosQueTiene.value ? filtrarLosQueTiene(todos.value) : todos.value));

  return { datos, cargando, cargar, edicion, inicial, soloLosQueTiene, roles, todos, grupos };
}

/** La página «Roles y permisos» de un usuario: lo que tiene, de dónde le viene y los cambios a guardar. */
export function usarPermisosDeUsuario(usuarioId: string) {
  const sesion = usarSesion();
  const base = usarEdicionDePermisos(usuarioId);
  const { edicion, inicial, roles } = base;
  const guardado = usarGuardadoDePermisos(usuarioId, base);
  const esElMismo = computed(() => usuarioId === sesion.usuario?.id);

  return {
    ...guardado,
    usuario: computed(() => base.datos.value?.usuario ?? null),
    roles,
    grupos: base.grupos,
    edicion,
    cargando: base.cargando,
    esElMismo,
    puedeEditar: computed(() => sesion.puede('usuarios.asignar-permisos') && !esElMismo.value),
    cambios: computed(() => hayCambios(inicial.value, edicion.value)),
    soloLosQueTiene: base.soloLosQueTiene,
    total: computed(() => totalDePermisos(base.todos.value)),
    rolConAccesoTotal: computed(() => rolConAccesoTotal(roles.value, edicion.value)),
    marcarTodos: (grupo: GrupoConOrigen, marcar: boolean) =>
      (edicion.value.directos = marcarGrupo(edicion.value, grupo, marcar)),
    descartar: () => (edicion.value = { rolIds: [...inicial.value.rolIds], directos: [...inicial.value.directos] }),
  };
}
