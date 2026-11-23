<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { ETIQUETAS_DE_METODO } from '../../composables/compartido/etiquetas';
import type { MetodoDeCosteo } from '../../servicios/metodo-de-costeo.api';

/** Elegir el método: dos opciones con su explicación; solo guarda si cambió algo. */
defineProps<{ actual: MetodoDeCosteo; hayCambio: boolean; enviando: boolean }>();
const elegido = defineModel<MetodoDeCosteo | null>({ required: true });
const emit = defineEmits<{ guardar: [] }>();

const OPCIONES: { valor: MetodoDeCosteo; ayuda: string }[] = [
  {
    valor: 'promedio_ponderado',
    ayuda: 'Cada compra nueva promedia su costo con lo que ya hay. Es el más simple de explicar y de revisar.',
  },
  {
    valor: 'peps',
    ayuda:
      'Se consume primero lo que entró primero y cada compra conserva su costo. Sigue de cerca los precios que cambian.',
  },
];
</script>

<template>
  <TarjetaBase>
    <fieldset class="space-y-3">
      <legend class="font-semibold">Método de costeo de la empresa</legend>
      <label
        v-for="opcion in OPCIONES"
        :key="opcion.valor"
        class="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-3 ring-1 ring-tierra-200 has-[:checked]:bg-campo-50 has-[:checked]:ring-campo-500 dark:ring-tierra-700 dark:has-[:checked]:bg-campo-900/40"
      >
        <input
          v-model="elegido"
          type="radio"
          name="metodo-de-costeo"
          :value="opcion.valor"
          class="mt-1 size-4 text-campo-700 focus:ring-campo-500"
        />
        <span>
          <span class="block font-medium">{{ ETIQUETAS_DE_METODO[opcion.valor] }}</span>
          <span class="block text-sm text-tierra-600 dark:text-tierra-300">{{ opcion.ayuda }}</span>
        </span>
      </label>
    </fieldset>
    <div class="mt-4 flex justify-end">
      <BotonBase :deshabilitado="!hayCambio" :cargando="enviando" @click="emit('guardar')">Guardar método</BotonBase>
    </div>
  </TarjetaBase>
</template>
