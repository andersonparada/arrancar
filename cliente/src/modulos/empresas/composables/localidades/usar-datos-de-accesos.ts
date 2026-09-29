import { ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import {
  apiAccesosALocalidades as api,
  type LocalidadParaAsignar,
  type UsuarioParaAccesos,
} from '../../servicios/accesos-a-localidades.api';

/** Lo que trae la ventana de accesos: usuarios, localidades y las localidades del usuario elegido. */
export function usarDatosDeAccesos() {
  const { cargando, traer } = usarTraida();
  const abierta = ref(false);
  const usuarios = ref<UsuarioParaAccesos[]>([]);
  const localidades = ref<LocalidadParaAsignar[]>([]);
  const usuarioId = ref<string | null>(null);
  const original = ref<string[]>([]);
  const seleccion = ref<string[]>([]);

  async function abrir(): Promise<void> {
    const listo = await traer(async () => {
      [usuarios.value, localidades.value] = await Promise.all([api.listarUsuarios(), api.listarLocalidades()]);
    }, 'No se pudieron cargar los usuarios y las localidades.');
    if (!listo) return;
    usuarioId.value = null;
    abierta.value = true;
  }

  vigilarUsuario({ usuarioId, original, seleccion }, traer);

  return { abierta, cargando, usuarios, localidades, usuarioId, original, seleccion, abrir };
}

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

/** Al elegir otro usuario trae sus localidades; sin usuario deja la selección vacía. */
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
