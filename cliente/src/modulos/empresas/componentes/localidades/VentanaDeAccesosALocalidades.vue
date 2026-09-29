<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { LocalidadParaAsignar, UsuarioParaAccesos } from '../../servicios/accesos-a-localidades.api';

/** Reparte las localidades de un usuario: elige al usuario, marca las localidades y guarda el conjunto final. */
const props = defineProps<{
  abierta: boolean;
  cargando: boolean;
  enviando: boolean;
  usuario: UsuarioParaAccesos | null;
  opciones: OpcionDeRegistro[];
  localidades: LocalidadParaAsignar[];
  seleccion: string[];
  resumen: string | null;
  esPropio: boolean;
}>();
const usuarioId = defineModel<string | null>('usuarioId', { required: true });
const emit = defineEmits<{ cerrar: []; alternar: [id: string]; marcar: [marcar: boolean]; guardar: [] }>();

const informativas = computed(() => props.usuario?.veTodas ?? false);
const todasMarcadas = computed(() => props.localidades.every((l) => props.seleccion.includes(l.id)));
const puedeGuardar = computed(() => !!props.usuario && !informativas.value && !!props.resumen && !props.cargando);
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Accesos a localidades" ancha @cerrar="emit('cerrar')">
    <div class="space-y-4">
      <CampoSelector v-model="usuarioId" etiqueta="Usuario" :opciones="opciones" />

      <p v-if="esPropio" class="rounded-lg bg-trigo-300/30 px-3 py-2 text-sm dark:bg-trigo-500/20" role="status">
        Es usted: al guardar se está dando acceso a sí mismo. Queda registrado en la auditoría.
      </p>
      <p
        v-if="informativas"
        class="rounded-lg bg-campo-50 px-3 py-2 text-sm text-campo-800 dark:bg-campo-900 dark:text-campo-100"
        role="status"
      >
        Este usuario ya ve todas las localidades por sus permisos. No necesita asignaciones; las casillas son solo
        informativas.
      </p>

      <p v-if="!usuario" class="text-sm text-tierra-500">Elija un usuario para ver y cambiar sus localidades.</p>
      <p v-else-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
      <p v-else-if="!localidades.length" class="text-sm text-tierra-500">
        Todavía no hay localidades. Créelas primero desde la lista.
      </p>
      <fieldset v-else :disabled="informativas || enviando" class="space-y-2">
        <legend class="sr-only">Localidades de {{ usuario.usuario }}</legend>
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm text-tierra-500" aria-live="polite">
            {{ informativas ? localidades.length : seleccion.length }} de {{ localidades.length }} marcadas
          </p>
          <BotonBase v-if="!informativas" variante="fantasma" pequeno @click="emit('marcar', !todasMarcadas)">
            {{ todasMarcadas ? 'Desmarcar todas' : 'Marcar todas' }}
          </BotonBase>
        </div>
        <ul
          class="divide-y divide-tierra-100 rounded-lg ring-1 ring-tierra-200 dark:divide-tierra-800 dark:ring-tierra-700"
        >
          <li v-for="localidad in localidades" :key="localidad.id">
            <label class="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2">
              <input
                type="checkbox"
                class="size-5 rounded border-tierra-300 text-campo-700 focus:ring-campo-500"
                :checked="informativas || seleccion.includes(localidad.id)"
                @change="emit('alternar', localidad.id)"
              />
              <span class="min-w-0 flex-1">
                <span class="block truncate">{{ localidad.nombre }}</span>
                <span class="block truncate text-xs text-tierra-500">
                  {{ localidad.codigo }}<template v-if="localidad.tipoNombre"> · {{ localidad.tipoNombre }}</template>
                </span>
              </span>
              <InsigniaBase v-if="!localidad.activo" tono="rojo">Inactiva</InsigniaBase>
            </label>
          </li>
        </ul>
        <p v-if="resumen" class="text-sm font-medium" role="status">{{ resumen }}</p>
      </fieldset>
    </div>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cerrar</BotonBase>
      <BotonBase :deshabilitado="!puedeGuardar" :cargando="enviando" @click="emit('guardar')"
        >Guardar accesos</BotonBase
      >
    </template>
  </VentanaModal>
</template>
