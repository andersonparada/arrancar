<script setup lang="ts">
import { computed } from 'vue';
import { Info, Save, ShieldCheck } from 'lucide-vue-next';
import BotonBase from '../componentes/BotonBase.vue';
import CampoInterruptor from '../componentes/CampoInterruptor.vue';
import EncabezadoPagina from '../componentes/EncabezadoPagina.vue';
import EstadoVacio from '../componentes/EstadoVacio.vue';
import ListaDePermisosConOrigen from '../componentes/usuarios/ListaDePermisosConOrigen.vue';
import SeccionDeRoles from '../componentes/usuarios/SeccionDeRoles.vue';
import { nombreCompleto } from '../composables/usuarios/edicion-de-usuario';
import { usarPermisosDeUsuario } from '../composables/usuarios/usar-permisos-de-usuario';
import { VENTANAS_CORE } from '../textos';

const props = defineProps<{ usuarioId: string }>();
const permisos = usarPermisosDeUsuario(props.usuarioId);
const { usuario, edicion, cargando } = permisos;
const nombre = computed(() => (usuario.value ? nombreCompleto(usuario.value) : ''));
const soloLectura = computed(() => !permisos.puedeEditar.value || permisos.enviando.value);
</script>

<template>
  <div class="pb-24">
    <EncabezadoPagina
      :titulo="`${VENTANAS_CORE.permisosDeUsuario.titulo}: ${nombre}`"
      descripcion="Los roles son atajos y se suman a los permisos directos. Valen en todas las empresas a las que entra."
      :volver="{ texto: 'Usuarios', ruta: { name: 'usuarios' } }"
    />

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!usuario" :icono="ShieldCheck" titulo="No se encontró al usuario" />
    <div v-else class="space-y-5">
      <p
        v-if="permisos.esElMismo.value || !permisos.puedeEditar.value"
        class="flex items-start gap-2 rounded-xl bg-trigo-300/30 p-3 text-sm dark:bg-trigo-500/10"
        role="status"
      >
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {{
          permisos.esElMismo.value
            ? 'No puede cambiar sus propios roles ni permisos: pídaselo a otra persona con este permiso.'
            : 'Solo puede consultar: no tiene permiso para asignar roles y permisos.'
        }}
      </p>
      <SeccionDeRoles v-model="edicion.rolIds" :roles="permisos.roles.value" :deshabilitado="soloLectura" />

      <section aria-labelledby="titulo-permisos" class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 id="titulo-permisos" class="font-semibold">
            Permisos <span class="text-sm font-normal text-tierra-500">· {{ permisos.total.value }} en total</span>
          </h2>
          <CampoInterruptor v-model="permisos.soloLosQueTiene.value" etiqueta="Solo los que tiene" />
        </div>
        <p
          v-if="permisos.rolConAccesoTotal.value"
          class="rounded-xl bg-campo-100 p-3 text-sm dark:bg-campo-900"
          role="status"
        >
          Tiene todos los permisos por el rol <strong>{{ permisos.rolConAccesoTotal.value.nombre }}</strong
          >.
        </p>
        <ListaDePermisosConOrigen
          v-else
          v-model="edicion.directos"
          :grupos="permisos.grupos.value"
          :deshabilitado="soloLectura"
          @marcar-todos="permisos.marcarTodos"
        />
      </section>
    </div>

    <div
      v-if="permisos.puedeEditar.value && permisos.cambios.value"
      class="fixed inset-x-0 bottom-0 z-20 flex justify-end gap-2 border-t border-tierra-200 bg-white/95 p-3 backdrop-blur lg:left-72 dark:border-tierra-700 dark:bg-tierra-900/95"
    >
      <BotonBase variante="secundario" @click="permisos.descartar">Descartar cambios</BotonBase>
      <BotonBase :icono="Save" :cargando="permisos.enviando.value" @click="permisos.guardar">Guardar</BotonBase>
    </div>
  </div>
</template>
