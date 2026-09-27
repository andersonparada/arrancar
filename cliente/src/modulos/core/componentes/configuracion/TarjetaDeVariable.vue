<script setup lang="ts">
import {
  llaveDelBorrador,
  nivelesEditables,
  NOMBRES_DEL_ORIGEN,
} from '../../composables/configuracion/valores-de-configuracion';
import type { NivelEditable, VariableConfiguracion } from '../../servicios/configuracion.api';
import InsigniaBase from '../InsigniaBase.vue';
import TarjetaBase from '../TarjetaBase.vue';
import CampoDeNivel from './CampoDeNivel.vue';

defineProps<{ variable: VariableConfiguracion; puedeGestionar: boolean }>();
const emit = defineEmits<{ guardar: [nivel: NivelEditable]; restablecer: [nivel: NivelEditable] }>();
const borradores = defineModel<Record<string, unknown>>({ required: true });
</script>

<template>
  <TarjetaBase class="space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="font-medium">{{ variable.descripcion }}</p>
        <p class="font-mono text-xs text-tierra-400">{{ variable.clave }}</p>
      </div>
      <div class="flex items-center gap-2 text-sm">
        <span class="text-tierra-500">Valor actual:</span>
        <strong>{{ variable.efectivo }}</strong>
        <InsigniaBase :tono="variable.origen === 'predeterminado' ? 'tierra' : 'campo'">{{
          NOMBRES_DEL_ORIGEN[variable.origen]
        }}</InsigniaBase>
      </div>
    </div>

    <div v-if="puedeGestionar" class="grid gap-3 sm:grid-cols-2">
      <CampoDeNivel
        v-for="nivel in nivelesEditables(variable)"
        :key="nivel"
        v-model="borradores[llaveDelBorrador(variable, nivel)]"
        :variable="variable"
        :nivel="nivel"
        @guardar="emit('guardar', nivel)"
        @restablecer="emit('restablecer', nivel)"
      />
    </div>
  </TarjetaBase>
</template>
