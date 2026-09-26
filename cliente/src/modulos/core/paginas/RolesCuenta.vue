<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-vue-next';
import { usarAvisos } from '../almacenes/avisos';
import BotonBase from '../componentes/BotonBase.vue';
import CampoInterruptor from '../componentes/CampoInterruptor.vue';
import CampoTexto from '../componentes/CampoTexto.vue';
import EncabezadoPagina from '../componentes/EncabezadoPagina.vue';
import Insignia from '../componentes/Insignia.vue';
import Tarjeta from '../componentes/Tarjeta.vue';
import VentanaModal from '../componentes/VentanaModal.vue';
import { usarFormulario } from '../composables/usar-formulario';
import { rolesApi, type GrupoPermisos, type Rol } from '../servicios/roles.api';

const avisos = usarAvisos();
const formulario = usarFormulario();
const roles = ref<Rol[]>([]);
const catalogo = ref<GrupoPermisos[]>([]);

const edicion = reactive({
  abierta: false,
  rolId: null as string | null,
  nombre: '',
  descripcion: '',
  accesoTotal: false,
  permisos: [] as string[],
});

async function cargar(): Promise<void> {
  try {
    [roles.value, catalogo.value] = await Promise.all([rolesApi.listar(), rolesApi.catalogoPermisos()]);
  } catch (error) {
    avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar los roles.');
  }
}

function abrir(rol?: Rol): void {
  Object.assign(edicion, {
    abierta: true,
    rolId: rol?.id ?? null,
    nombre: rol?.nombre ?? '',
    descripcion: rol?.descripcion ?? '',
    accesoTotal: rol?.accesoTotal ?? false,
    permisos: [...(rol?.permisos ?? [])],
  });
  formulario.errores.value = {};
}

async function guardar(): Promise<void> {
  const datos = {
    nombre: edicion.nombre,
    descripcion: edicion.descripcion || null,
    accesoTotal: edicion.accesoTotal,
    permisos: edicion.permisos,
  };
  const exito = await formulario.enviar(() =>
    edicion.rolId ? rolesApi.actualizar(edicion.rolId, datos) : rolesApi.crear(datos),
  );
  if (!exito) return;
  avisos.exito('Rol guardado.');
  edicion.abierta = false;
  await cargar();
}

async function eliminar(rol: Rol): Promise<void> {
  const aceptado = await avisos.confirmar({
    titulo: 'Eliminar rol',
    mensaje: `¿Eliminar el rol "${rol.nombre}"? Esta acción no se puede deshacer.`,
    textoConfirmar: 'Eliminar',
    peligroso: true,
  });
  if (!aceptado) return;
  const exito = await formulario.enviar(() => rolesApi.eliminar(rol.id));
  if (exito) {
    avisos.exito('Rol eliminado.');
    await cargar();
  }
}

onMounted(cargar);
</script>

<template>
  <div>
    <EncabezadoPagina titulo="Roles y permisos" descripcion="Cada rol agrupa permisos de pantallas y de acciones. Un usuario tiene un rol en cada empresa.">
      <BotonBase v-permiso="'roles.gestionar'" :icono="Plus" @click="abrir()">Nuevo rol</BotonBase>
    </EncabezadoPagina>

    <ul class="grid gap-3 md:grid-cols-2">
      <li v-for="rol in roles" :key="rol.id">
        <Tarjeta class="flex h-full flex-col gap-2">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="font-semibold">{{ rol.nombre }}</p>
              <p v-if="rol.descripcion" class="text-sm text-tierra-600 dark:text-tierra-300">{{ rol.descripcion }}</p>
            </div>
            <Insignia v-if="rol.accesoTotal" tono="trigo">Acceso total</Insignia>
          </div>
          <p class="text-sm text-tierra-500">
            {{ rol.accesoTotal ? 'Todos los permisos' : `${rol.permisos.length} permisos` }} · {{ rol.totalUsuarios }} asignaciones
          </p>
          <div v-permiso="'roles.gestionar'" class="mt-auto flex justify-end gap-1">
            <BotonBase variante="fantasma" pequeno :icono="Pencil" @click="abrir(rol)">Editar</BotonBase>
            <BotonBase variante="fantasma" pequeno :icono="Trash2" :deshabilitado="rol.totalUsuarios > 0" @click="eliminar(rol)">Eliminar</BotonBase>
          </div>
        </Tarjeta>
      </li>
    </ul>

    <VentanaModal :abierta="edicion.abierta" :titulo="edicion.rolId ? 'Editar rol' : 'Nuevo rol'" ancha @cerrar="edicion.abierta = false">
      <form id="form-rol" class="space-y-5" @submit.prevent="guardar">
        <div class="grid gap-4 sm:grid-cols-2">
          <CampoTexto v-model="edicion.nombre" etiqueta="Nombre" requerido :error="formulario.errores.value.nombre" />
          <CampoTexto v-model="edicion.descripcion" etiqueta="Descripción" :error="formulario.errores.value.descripcion" />
        </div>
        <CampoInterruptor
          v-model="edicion.accesoTotal"
          etiqueta="Acceso total"
          descripcion="Tiene todos los permisos, incluidos los de módulos que se activen en el futuro."
        />
        <div v-if="!edicion.accesoTotal" class="space-y-4">
          <fieldset v-for="grupo in catalogo" :key="grupo.modulo" class="rounded-xl ring-1 ring-tierra-200 dark:ring-tierra-700">
            <legend class="ml-3 flex items-center gap-1.5 px-1 text-sm font-semibold">
              <ShieldCheck class="size-4 text-campo-600" aria-hidden="true" />{{ grupo.nombre }}
            </legend>
            <div class="grid gap-2 p-3 sm:grid-cols-2">
              <label v-for="permiso in grupo.permisos" :key="permiso.clave" class="flex cursor-pointer items-start gap-2.5 rounded-lg p-2 hover:bg-tierra-50 dark:hover:bg-tierra-800">
                <input v-model="edicion.permisos" type="checkbox" :value="permiso.clave" class="mt-0.5 size-4 rounded accent-campo-700" />
                <span class="text-sm">
                  {{ permiso.descripcion }}
                  <span class="block font-mono text-xs text-tierra-400">{{ permiso.clave }}</span>
                </span>
              </label>
            </div>
          </fieldset>
        </div>
      </form>
      <template #pie>
        <BotonBase variante="secundario" @click="edicion.abierta = false">Cancelar</BotonBase>
        <BotonBase tipo="submit" form="form-rol" :cargando="formulario.enviando.value">Guardar</BotonBase>
      </template>
    </VentanaModal>
  </div>
</template>
