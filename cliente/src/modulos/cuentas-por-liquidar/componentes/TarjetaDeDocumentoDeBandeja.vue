<script setup lang="ts">
import { computed, useId } from 'vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { detallesDeLaFilaDeBandeja, motivoDeNoAsignable } from '../composables/bandeja/bandeja';
import { tituloDelGasto } from '../composables/gastos/gastos-del-anticipo';
import type { GastoDeBandeja } from '../servicios/tipos-de-gastos';

/** Un documento de la bandeja con su casilla para marcarlo; si lleva retención y no se puede asignar, dice por qué. */
const props = defineProps<{ gasto: GastoDeBandeja; marcado: boolean }>();
defineEmits<{ alternar: [] }>();
const id = useId();
const motivo = computed(() => motivoDeNoAsignable(props.gasto));
</script>

<template>
  <TarjetaBase :class="{ 'ring-2 ring-campo-500': marcado, 'opacity-80': motivo }">
    <div class="flex items-start gap-3">
      <input
        :id="id"
        type="checkbox"
        class="mt-1 size-5 shrink-0 accent-campo-700"
        :checked="marcado"
        :disabled="motivo !== null"
        :aria-describedby="motivo ? `${id}-motivo` : undefined"
        @change="$emit('alternar')"
      />
      <div class="min-w-0 flex-1">
        <label :for="id" class="block break-words font-medium" :class="{ 'cursor-pointer': !motivo }">
          {{ tituloDelGasto(gasto) }}
        </label>
        <InsigniaBase v-if="gasto.conRetencion" class="mt-1" tono="trigo">Con retención</InsigniaBase>
        <dl class="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div v-for="detalle in detallesDeLaFilaDeBandeja(gasto)" :key="detalle.etiqueta">
            <dt class="inline text-xs text-tierra-500">{{ detalle.etiqueta }}:</dt>
            <dd class="ml-1 inline break-words">{{ detalle.valor }}</dd>
          </div>
        </dl>
        <p v-if="motivo" :id="`${id}-motivo`" class="mt-2 text-sm text-tierra-600 dark:text-tierra-300">{{ motivo }}</p>
        <ul
          v-if="gasto.avisos.length > 0"
          class="mt-2 list-disc space-y-1 pl-5 text-sm text-tierra-700 dark:text-tierra-200"
        >
          <li v-for="aviso in gasto.avisos" :key="aviso">{{ aviso }}</li>
        </ul>
      </div>
    </div>
  </TarjetaBase>
</template>
