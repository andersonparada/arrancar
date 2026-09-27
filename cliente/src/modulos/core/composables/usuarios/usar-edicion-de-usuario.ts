import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { usarSesion } from '../../almacenes/sesion';
import type { Rol } from '../../servicios/roles.api';
import { apiUsuarios, type Usuario } from '../../servicios/usuarios.api';
import { alDejarDeEscribir } from '../al-dejar-de-escribir';
import { usarFormulario } from '../usar-formulario';
import {
  cambiosDelUsuario,
  datosDelNuevoUsuario,
  edicionDe,
  SIN_ACCESO,
  usuarioLimpio,
  type EdicionDeUsuario,
} from './edicion-de-usuario';

const idsDe = (empresas: { id: string }[]) => empresas.map((empresa) => empresa.id);

/** Guarda al usuario y devuelve el aviso para el administrador. */
async function guardarUsuario(edicion: EdicionDeUsuario, esElMismo: boolean): Promise<string> {
  if (edicion.usuarioId === null) {
    const creado = await apiUsuarios.crear(datosDelNuevoUsuario(edicion));
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

/** Las empresas de la cuenta activa y los roles que se pueden dar en cada una. */
function usarOpcionesDeAcceso(roles: Readonly<Ref<Rol[]>>) {
  const sesion = usarSesion();
  const empresas = computed(() =>
    sesion.empresasDisponibles.filter((empresa) => empresa.cuentaId === sesion.empresa?.cuentaId),
  );
  const opcionesRol = computed(() => [
    { valor: SIN_ACCESO, texto: 'Sin acceso' },
    ...roles.value.map((rol) => ({ valor: rol.id, texto: rol.nombre })),
  ]);
  return { empresas, opcionesRol };
}

/** La ventana de alta y edición de usuarios, con un rol por cada empresa de la cuenta. */
export function usarEdicionDeUsuario(roles: Readonly<Ref<Rol[]>>, alGuardar: () => Promise<void>) {
  const sesion = usarSesion();
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const { empresas, opcionesRol } = usarOpcionesDeAcceso(roles);
  const edicion = ref<EdicionDeUsuario>({ ...edicionDe([]), abierta: false });
  const esElMismo = computed(() => edicion.value.usuarioId === sesion.usuario?.id);

  function abrir(usuario?: Usuario): void {
    edicion.value = edicionDe(idsDe(empresas.value), usuario);
    errores.value = {};
  }

  function escribirUsuario(valor: unknown): void {
    edicion.value.usuario = usuarioLimpio(valor);
    edicion.value.usuarioEscritoAMano = edicion.value.usuario.length > 0;
  }

  async function guardar(): Promise<void> {
    let aviso = '';
    if (!(await enviar(async () => (aviso = await guardarUsuario(edicion.value, esElMismo.value))))) return;
    avisos.exito(aviso);
    edicion.value.abierta = false;
    await alGuardar();
  }

  sugerirUsuarioAlEscribir(edicion);
  return { edicion, empresas, opcionesRol, esElMismo, enviando, errores, abrir, escribirUsuario, guardar };
}
