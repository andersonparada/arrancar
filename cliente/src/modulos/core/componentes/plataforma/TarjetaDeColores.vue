<script setup lang="ts">
import { Palette, TriangleAlert } from 'lucide-vue-next';
import { PALETAS, type Colores } from '../../composables/plataforma/paletas';
import CampoColor from '../CampoColor.vue';
import TarjetaBase from '../TarjetaBase.vue';

defineProps<{ acentoPocoVisible: boolean }>();
const emit = defineEmits<{ elegir: [colores: Colores] }>();
const principal = defineModel<string>('principal', { required: true });
const acento = defineModel<string>('acento', { required: true });
</script>

<template>
  <TarjetaBase class="space-y-4">
    <h2 class="flex items-center gap-2 font-semibold">
      <Palette class="size-5 text-tierra-500" aria-hidden="true" />Colores
    </h2>
    <div class="grid gap-4 sm:grid-cols-2">
      <CampoColor
        v-model="principal"
        etiqueta="Color principal"
        ayuda="Menú lateral, encabezado y fondo del inicio de sesión."
      />
      <CampoColor
        v-model="acento"
        etiqueta="Color de acento"
        ayuda="Resaltados: opción activa del menú, iniciales del usuario."
      />
    </div>
    <p v-if="acentoPocoVisible" class="flex items-center gap-2 rounded-lg bg-trigo-300/30 px-3 py-2 text-sm">
      <TriangleAlert class="size-4 shrink-0 text-trigo-500" aria-hidden="true" />
      El acento casi no se distingue del color principal.
    </p>
    <div>
      <p class="mb-2 text-sm font-medium text-tierra-700 dark:text-tierra-200">Paletas sugeridas</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="paleta in PALETAS"
          :key="paleta.nombre"
          type="button"
          class="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm ring-1 ring-tierra-200 hover:ring-tierra-400 dark:ring-tierra-700"
          @click="emit('elegir', paleta)"
        >
          <span class="flex">
            <span
              class="size-5 rounded-full ring-2 ring-white dark:ring-tierra-900"
              :style="{ background: paleta.principal }"
            />
            <span
              class="-ml-1.5 size-5 rounded-full ring-2 ring-white dark:ring-tierra-900"
              :style="{ background: paleta.acento }"
            />
          </span>
          {{ paleta.nombre }}
        </button>
      </div>
    </div>
    <p class="text-xs text-tierra-500">
      Los botones, avisos y formularios conservan sus colores para que la app sea igual de clara en todas las
      instalaciones.
    </p>
  </TarjetaBase>
</template>
