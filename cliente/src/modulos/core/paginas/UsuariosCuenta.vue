<script setup lang="ts">
import { VENTANAS_CORE } from '../textos';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { KeyRound, Pencil, UserPlus, Users } from 'lucide-vue-next';
import { usarAvisos } from '../almacenes/avisos';
import { usarSesion } from '../almacenes/sesion';
import BotonBase from '../componentes/BotonBase.vue';
import CampoInterruptor from '../componentes/CampoInterruptor.vue';
import CampoSelector from '../componentes/CampoSelector.vue';
import CampoTexto from '../componentes/CampoTexto.vue';
import EncabezadoPagina from '../componentes/EncabezadoPagina.vue';
import EstadoVacio from '../componentes/EstadoVacio.vue';
import InsigniaBase from '../componentes/InsigniaBase.vue';
import TarjetaBase from '../componentes/TarjetaBase.vue';
import VentanaModal from '../componentes/VentanaModal.vue';
import { usarFormulario } from '../composables/usar-formulario';
import { apiRoles, type Rol } from '../servicios/roles.api';
import { apiUsuarios, type Usuario } from '../servicios/usuarios.api';
import { formatearFechaHora } from '../utilidades/formato';

const sesion = usarSesion();
const avisos = usarAvisos();
const formulario = usarFormulario();

const usuarios = ref<Usuario[]>([]);
const roles = ref<Rol[]>([]);
const cargando = ref(true);

const SIN_ACCESO = '';
const ESPERA_SUGERENCIA_MS = 400;
const empresasDeLaCuenta = computed(() =>
  sesion.empresasDisponibles.filter((e) => e.cuentaId === sesion.empresa?.cuentaId),
);
const opcionesRol = computed(() => [
  { valor: SIN_ACCESO, texto: 'Sin acceso' },
  ...roles.value.map((r) => ({ valor: r.id, texto: r.nombre })),
]);

const edicion = reactive({
  abierta: false,
  usuarioId: null as string | null,
  nombres: '',
  apellidos: '',
  usuario: '',
  /** Deja de sugerir en cuanto el administrador escribe el usuario a mano. */
  usuarioEscritoAMano: false,
  correo: '',
  contrasena: '',
  activo: true,
  rolPorEmpresa: {} as Record<string, string>,
});
const cambioContrasena = reactive({ abierta: false, usuario: null as Usuario | null, contrasena: '' });

const nombreCompleto = (usuario: Usuario) => `${usuario.nombres} ${usuario.apellidos}`.trim();

async function cargar(): Promise<void> {
  cargando.value = true;
  try {
    [usuarios.value, roles.value] = await Promise.all([apiUsuarios.listar(), apiRoles.listar()]);
  } catch (error) {
    avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar los usuarios.');
  } finally {
    cargando.value = false;
  }
}

function abrir(usuario?: Usuario): void {
  Object.assign(edicion, {
    abierta: true,
    usuarioId: usuario?.id ?? null,
    nombres: usuario?.nombres ?? '',
    apellidos: usuario?.apellidos ?? '',
    usuario: usuario?.usuario ?? '',
    usuarioEscritoAMano: false,
    correo: usuario?.correo ?? '',
    contrasena: '',
    activo: usuario?.activo ?? true,
    rolPorEmpresa: Object.fromEntries(
      empresasDeLaCuenta.value.map((e) => [
        e.id,
        usuario?.accesos.find((a) => a.empresaId === e.id)?.rolId ?? SIN_ACCESO,
      ]),
    ),
  });
  formulario.errores.value = {};
}

let temporizadorSugerencia: ReturnType<typeof setTimeout> | undefined;
watch(
  () => [edicion.nombres, edicion.apellidos],
  ([nombres, apellidos]) => {
    clearTimeout(temporizadorSugerencia);
    if (edicion.usuarioId || edicion.usuarioEscritoAMano || !nombres?.trim()) return;
    temporizadorSugerencia = setTimeout(async () => {
      try {
        const { usuario } = await apiUsuarios.sugerirUsuario(nombres, apellidos ?? '');
        if (!edicion.usuarioEscritoAMano) edicion.usuario = usuario ?? '';
      } catch {
        // Sin sugerencia: el administrador puede escribirlo a mano.
      }
    }, ESPERA_SUGERENCIA_MS);
  },
);

function escribirUsuario(valor: string | number | null | undefined): void {
  edicion.usuario = String(valor ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z]/g, '');
  edicion.usuarioEscritoAMano = edicion.usuario.length > 0;
}

async function guardar(): Promise<void> {
  const accesos = Object.entries(edicion.rolPorEmpresa)
    .filter(([, rolId]) => rolId !== SIN_ACCESO)
    .map(([empresaId, rolId]) => ({ empresaId, rolId }));
  const esNuevo = edicion.usuarioId === null;
  const esElMismo = edicion.usuarioId === sesion.usuario?.id;
  let usuarioCreado = '';

  const exito = await formulario.enviar(async () => {
    if (esNuevo) {
      const creado = await apiUsuarios.crear({
        nombres: edicion.nombres,
        apellidos: edicion.apellidos,
        usuario: edicion.usuario || undefined,
        correo: edicion.correo || null,
        contrasena: edicion.contrasena,
        accesos,
      });
      usuarioCreado = creado.usuario;
    } else {
      await apiUsuarios.actualizar(edicion.usuarioId!, {
        nombres: edicion.nombres,
        apellidos: edicion.apellidos,
        correo: edicion.correo || null,
        ...(esElMismo ? {} : { activo: edicion.activo, accesos }),
      });
    }
  });
  if (!exito) return;
  avisos.exito(esNuevo ? `Usuario creado. Inicia sesión como "${usuarioCreado}".` : 'Usuario actualizado.');
  edicion.abierta = false;
  await cargar();
}

async function guardarContrasena(): Promise<void> {
  const usuario = cambioContrasena.usuario;
  if (!usuario) return;
  const exito = await formulario.enviar(() => apiUsuarios.cambiarContrasena(usuario.id, cambioContrasena.contrasena));
  if (!exito) return;
  avisos.exito('Contraseña cambiada. El usuario deberá volver a iniciar sesión.');
  cambioContrasena.abierta = false;
}

onMounted(cargar);
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="VENTANAS_CORE.usuarios.titulo" :descripcion="VENTANAS_CORE.usuarios.descripcion">
      <BotonBase v-permiso="'usuarios.gestionar'" :icono="UserPlus" @click="abrir()">Nuevo usuario</BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!usuarios.length" :icono="Users" titulo="Todavía no hay usuarios" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="usuario in usuarios" :key="usuario.id">
        <TarjetaBase class="flex h-full flex-col gap-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate font-semibold">{{ nombreCompleto(usuario) }}</p>
              <p class="truncate font-mono text-sm text-tierra-500">{{ usuario.usuario }}</p>
              <p v-if="usuario.correo" class="truncate text-xs text-tierra-500">{{ usuario.correo }}</p>
            </div>
            <InsigniaBase :tono="usuario.activo ? 'campo' : 'rojo'">{{
              usuario.activo ? 'Activo' : 'Inactivo'
            }}</InsigniaBase>
          </div>
          <ul class="flex flex-wrap gap-1.5">
            <li v-for="acceso in usuario.accesos" :key="acceso.empresaId">
              <InsigniaBase>{{ acceso.empresaNombre }} · {{ acceso.rolNombre }}</InsigniaBase>
            </li>
          </ul>
          <div class="mt-auto flex items-center justify-between gap-2 pt-1">
            <p class="text-xs text-tierra-500">Último acceso: {{ formatearFechaHora(usuario.ultimoAccesoEn) }}</p>
            <div v-permiso="'usuarios.gestionar'" class="flex gap-1">
              <BotonBase
                variante="fantasma"
                pequeno
                :icono="KeyRound"
                aria-label="Cambiar contraseña"
                @click="Object.assign(cambioContrasena, { abierta: true, usuario, contrasena: '' })"
              />
              <BotonBase
                variante="fantasma"
                pequeno
                :icono="Pencil"
                aria-label="Editar usuario"
                @click="abrir(usuario)"
              />
            </div>
          </div>
        </TarjetaBase>
      </li>
    </ul>

    <VentanaModal
      :abierta="edicion.abierta"
      :titulo="edicion.usuarioId ? 'Editar usuario' : 'Nuevo usuario'"
      @cerrar="edicion.abierta = false"
    >
      <form id="form-usuario" class="space-y-4" @submit.prevent="guardar">
        <div class="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            v-model="edicion.nombres"
            etiqueta="Nombres"
            placeholder="Ej. Juan Carlos"
            requerido
            :error="formulario.errores.value.nombres"
          />
          <CampoTexto
            v-model="edicion.apellidos"
            etiqueta="Apellidos"
            placeholder="Ej. López García"
            :error="formulario.errores.value.apellidos"
          />
        </div>
        <CampoTexto
          :model-value="edicion.usuario"
          etiqueta="Usuario para iniciar sesión"
          :solo-lectura="edicion.usuarioId !== null"
          sin-correccion
          :ayuda="
            edicion.usuarioId
              ? 'El usuario no se puede cambiar.'
              : 'Se sugiere a partir del nombre (solo letras). Puede cambiarlo.'
          "
          :error="formulario.errores.value.usuario"
          @update:model-value="escribirUsuario"
        />
        <CampoTexto
          v-model="edicion.correo"
          etiqueta="Correo (opcional)"
          tipo="email"
          ayuda="Solo para enviarle informes; no se usa para iniciar sesión."
          :error="formulario.errores.value.correo"
        />
        <CampoTexto
          v-if="!edicion.usuarioId"
          v-model="edicion.contrasena"
          etiqueta="Contraseña inicial"
          tipo="password"
          autocompletar="new-password"
          ayuda="Mínimo 10 caracteres. Compártala con la persona por un medio seguro."
          requerido
          :error="formulario.errores.value.contrasena"
        />
        <template v-if="edicion.usuarioId !== sesion.usuario?.id">
          <CampoInterruptor
            v-if="edicion.usuarioId"
            v-model="edicion.activo"
            etiqueta="Usuario activo"
            descripcion="Un usuario inactivo no puede iniciar sesión."
          />
          <fieldset class="space-y-3">
            <legend class="text-sm font-semibold">Acceso por empresa</legend>
            <p v-if="formulario.errores.value.accesos" class="text-sm text-red-700">
              {{ formulario.errores.value.accesos }}
            </p>
            <CampoSelector
              v-for="empresa in empresasDeLaCuenta"
              :key="empresa.id"
              v-model="edicion.rolPorEmpresa[empresa.id]"
              :etiqueta="empresa.nombre"
              :opciones="opcionesRol"
            />
          </fieldset>
        </template>
        <p v-else class="text-sm text-tierra-500">No puede cambiar sus propios accesos.</p>
      </form>
      <template #pie>
        <BotonBase variante="secundario" @click="edicion.abierta = false">Cancelar</BotonBase>
        <BotonBase tipo="submit" form="form-usuario" :cargando="formulario.enviando.value">Guardar</BotonBase>
      </template>
    </VentanaModal>

    <VentanaModal
      :abierta="cambioContrasena.abierta"
      titulo="Cambiar contraseña"
      @cerrar="cambioContrasena.abierta = false"
    >
      <form id="form-contrasena" class="space-y-4" @submit.prevent="guardarContrasena">
        <p class="text-sm text-tierra-600">
          Nueva contraseña para
          <strong>{{ cambioContrasena.usuario && nombreCompleto(cambioContrasena.usuario) }}</strong
          >. Se cerrarán sus sesiones abiertas.
        </p>
        <CampoTexto
          v-model="cambioContrasena.contrasena"
          etiqueta="Nueva contraseña"
          tipo="password"
          autocompletar="new-password"
          requerido
          :error="formulario.errores.value.contrasena"
        />
      </form>
      <template #pie>
        <BotonBase variante="secundario" @click="cambioContrasena.abierta = false">Cancelar</BotonBase>
        <BotonBase tipo="submit" form="form-contrasena" :cargando="formulario.enviando.value">Cambiar</BotonBase>
      </template>
    </VentanaModal>
  </div>
</template>
