import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { usarSesion } from '../../almacenes/sesion';
import { apiUsuarios, type Usuario } from '../../servicios/usuarios.api';
import { alDejarDeEscribir } from '../al-dejar-de-escribir';
import { usarFormulario } from '../usar-formulario';
import {
  cambiosDelUsuario,
  datosDelNuevoUsuario,
  edicionDe,
  usuarioLimpio,
  type EdicionDeUsuario,
} from './edicion-de-usuario';

const porNombre = <T extends { nombre: string }>(lista: T[]) =>
  [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

/** Guarda al usuario y devuelve el aviso para el administrador. */
async function guardarUsuario(edicion: EdicionDeUsuario, esElMismo: boolean, puedeAsignar: boolean): Promise<string> {
  if (edicion.usuarioId === null) {
    const creado = await apiUsuarios.crear(datosDelNuevoUsuario(edicion, puedeAsignar));
    return `Usuario creado. Inicia sesión como "${creado.usuario}".`;
  }
  await apiUsuarios.actualizar(edicion.usuarioId, cambiosDelUsuario(edicion, esElMismo));
  return 'Usuario actualizado.';
}

/** Mientras se escribe el nombre de alguien nuevo, propone su usuario para iniciar sesión. */
function sugerirUsuarioAlEscribir(ventana: Ref<EdicionDeUsuario>): void {
  alDejarDeEscribir(
    () => [ventana.value.nombres, ventana.value.apellidos],
    async () => {
      const edicion = ventana.value;
      if (edicion.usuarioId || edicion.usuarioEscritoAMano || !edicion.nombres.trim()) return;
      const { usuario } = await apiUsuarios.sugerirUsuario(edicion.nombres, edicion.apellidos).catch(() => ({
        usuario: null,
      }));
      if (!edicion.usuarioEscritoAMano) edicion.usuario = usuario ?? '';
    },
  );
}

/** Guarda el usuario escrito a mano, ya limpio; mientras no escriba, se sigue sugiriendo. */
const escribirUsuarioEn = (edicion: Ref<EdicionDeUsuario>) => (valor: unknown) => {
  edicion.value.usuario = usuarioLimpio(valor);
  edicion.value.usuarioEscritoAMano = edicion.value.usuario.length > 0;
};

/** Las empresas de la cuenta activa, en orden de nombre. */
function usarEmpresasDeLaCuenta() {
  const sesion = usarSesion();
  return computed(() =>
    porNombre(sesion.empresasDisponibles.filter((empresa) => empresa.cuentaId === sesion.empresa?.cuentaId)),
  );
}

/** Envía el formulario, avisa y cierra la ventana; los errores por campo quedan en `errores`. */
function usarGuardadoDeUsuario(edicion: Ref<EdicionDeUsuario>, alGuardar: () => Promise<void>) {
  const sesion = usarSesion();
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const esElMismo = computed(() => edicion.value.usuarioId === sesion.usuario?.id);
  const puedeAsignar = computed(() => sesion.puede('usuarios.asignar-permisos'));

  async function guardar(): Promise<void> {
    let aviso = '';
    const enviado = await enviar(async () => {
      aviso = await guardarUsuario(edicion.value, esElMismo.value, puedeAsignar.value);
    });
    if (!enviado) return;
    avisos.exito(aviso);
    edicion.value.abierta = false;
    await alGuardar();
  }

  return { enviando, errores, esElMismo, puedeAsignar, guardar };
}

/** La ventana de alta y edición de usuarios: datos, empresas a las que entra y, al crear, roles y permisos. */
export function usarEdicionDeUsuario(alGuardar: () => Promise<void>) {
  const sesion = usarSesion();
  const empresas = usarEmpresasDeLaCuenta();
  const edicion = ref<EdicionDeUsuario>({ ...edicionDe(null), abierta: false });
  const guardado = usarGuardadoDeUsuario(edicion, alGuardar);

  function abrir(usuario?: Usuario): void {
    edicion.value = edicionDe(sesion.empresa?.id ?? null, usuario);
    guardado.errores.value = {};
  }

  sugerirUsuarioAlEscribir(edicion);
  return { ...guardado, edicion, empresas, abrir, escribirUsuario: escribirUsuarioEn(edicion) };
}
