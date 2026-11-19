import { computed, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import {
  apiAccesosAFondos as api,
  type FondoParaAsignar,
  type UsuarioParaAccesosAFondos,
} from '../../servicios/accesos-a-fondos.api';
import {
  alternarFondo,
  fondosPorNombre,
  marcarTodos,
  nombreDeUsuario,
  opcionesDeUsuarios,
  resumenDeCambios,
} from './edicion-de-accesos';

/** Ejecuta una carga con el indicador `cargando` y avisa con el mensaje del servidor si falla. */
function usarTraida() {
  const avisos = usarAvisos();
  const cargando = ref(false);

  async function traer(accion: () => Promise<void>, siFalla: string): Promise<boolean> {
    cargando.value = true;
    try {
      await accion();
      return true;
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : siFalla);
      return false;
    } finally {
      cargando.value = false;
    }
  }
  return { cargando, traer };
}

/** Al elegir otro usuario trae sus fondos; sin usuario deja la selección vacía. */
function vigilarUsuario(
  {
    usuarioId,
    original,
    seleccion,
  }: Record<'usuarioId', Ref<string | null>> & Record<'original' | 'seleccion', Ref<string[]>>,
  traer: (accion: () => Promise<void>, siFalla: string) => Promise<boolean>,
): void {
  watch(usuarioId, async (id) => {
    original.value = [];
    seleccion.value = [];
    if (!id) return;
    await traer(async () => {
      original.value = await api.obtenerDeUsuario(id);
      seleccion.value = [...original.value];
    }, 'No se pudieron cargar los accesos del usuario.');
  });
}

/** Lo que trae la ventana: usuarios, fondos y los fondos del usuario elegido. */
function usarDatos() {
  const { cargando, traer } = usarTraida();
  const abierta = ref(false);
  const usuarios = ref<UsuarioParaAccesosAFondos[]>([]);
  const fondos = ref<FondoParaAsignar[]>([]);
  const usuarioId = ref<string | null>(null);
  const original = ref<string[]>([]);
  const seleccion = ref<string[]>([]);

  async function abrir(): Promise<void> {
    const listo = await traer(async () => {
      [usuarios.value, fondos.value] = await Promise.all([api.listarUsuarios(), api.listarFondos()]);
    }, 'No se pudieron cargar los usuarios y los fondos.');
    if (!listo) return;
    usuarioId.value = null;
    abierta.value = true;
  }

  vigilarUsuario({ usuarioId, original, seleccion }, traer);

  return { abierta, cargando, usuarios, fondos, usuarioId, original, seleccion, abrir };
}

type Datos = ReturnType<typeof usarDatos>;

/** Guarda el conjunto final; quien se asigna a sí mismo lo confirma antes. */
function usarGuardado(datos: Datos, esPropio: () => boolean, resumen: () => string | null) {
  const avisos = usarAvisos();
  const { enviando, enviar } = usarFormulario();

  async function guardar(): Promise<void> {
    const id = datos.usuarioId.value;
    if (!id) return;
    const aviso = {
      titulo: 'Cambiar sus propios accesos',
      mensaje: `Está cambiando sus propios accesos. ${resumen() ?? ''} Todo queda registrado en la auditoría. ¿Continuar?`,
      textoConfirmar: 'Guardar',
    };
    if (esPropio() && !(await avisos.confirmar(aviso))) return;
    if (!(await enviar(() => api.reemplazarDeUsuario(id, datos.seleccion.value)))) return;
    const usuario = datos.usuarios.value.find((u) => u.usuarioId === id);
    avisos.exito(`Accesos de ${usuario ? nombreDeUsuario(usuario) : 'el usuario'} guardados.`);
    datos.abierta.value = false;
  }
  return { enviando, guardar };
}

function marcarLosFondos(datos: Datos, marcar: boolean): void {
  const ids = datos.fondos.value.map((f) => f.id);
  datos.seleccion.value = marcarTodos(datos.seleccion.value, ids, marcar);
}

/** La ventana de accesos a fondos: elegir un usuario, marcar sus fondos y guardar el conjunto final. */
export function usarAccesosAFondos() {
  const propioId = usarSesion().usuario?.id ?? null;
  const datos = usarDatos();
  const usuario = computed(() => datos.usuarios.value.find((u) => u.usuarioId === datos.usuarioId.value) ?? null);
  const resumen = computed(() => resumenDeCambios(datos.original.value, datos.seleccion.value));
  const esPropio = computed(() => !!datos.usuarioId.value && datos.usuarioId.value === propioId);
  const guardado = usarGuardado(
    datos,
    () => esPropio.value,
    () => resumen.value,
  );

  return {
    ...datos,
    ...guardado,
    usuario,
    resumen,
    esPropio,
    opciones: computed(() => opcionesDeUsuarios(datos.usuarios.value, propioId)),
    ordenados: computed(() => fondosPorNombre(datos.fondos.value)),
    cerrar: () => (datos.abierta.value = false),
    alternar: (id: string) => (datos.seleccion.value = alternarFondo(datos.seleccion.value, id)),
    marcar: (marcar: boolean) => marcarLosFondos(datos, marcar),
  };
}
