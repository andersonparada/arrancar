<script setup lang="ts">
import { RotateCcw, Save } from 'lucide-vue-next';
import type { NivelEditable, VariableConfiguracion } from '../../servicios/configuracion.api';
import BotonBase from '../BotonBase.vue';
import CampoInterruptor from '../CampoInterruptor.vue';
import CampoTexto from '../CampoTexto.vue';

/** El valor de una variable en un nivel (cuenta o empresa), con guardar y volver a heredar. */
const props = defineProps<{ variable: VariableConfiguracion; nivel: NivelEditable }>();
const emit = defineEmits<{ guardar: []; restablecer: [] }>();
const valor = defineModel<unknown>({ required: true });

const tipo = typeof props.variable.predeterminado;
const heredado = `Heredado: ${props.variable.valores.instalacion ?? props.variable.predeterminado}`;
</script>

<template>
  <div class="flex items-end gap-2">
    <CampoInterruptor
      v-if="tipo === 'boolean'"
      :model-value="Boolean(valor)"
      class="flex-1"
      :etiqueta="`Por ${nivel}`"
      @update:model-value="valor = $event"
    />
    <CampoTexto
      v-else
      :model-value="(valor as string | number | null) ?? null"
      class="flex-1"
      :etiqueta="`Por ${nivel}`"
      :tipo="tipo === 'number' ? 'number' : 'text'"
      :placeholder="heredado"
      @update:model-value="valor = $event"
    />
    <BotonBase variante="secundario" :icono="Save" :aria-label="`Guardar por ${nivel}`" @click="emit('guardar')" />
    <BotonBase
      v-if="variable.valores[nivel] !== undefined"
      variante="fantasma"
      :icono="RotateCcw"
      :aria-label="`Quitar valor por ${nivel}`"
      title="Volver a heredar"
      @click="emit('restablecer')"
    />
  </div>
</template>
