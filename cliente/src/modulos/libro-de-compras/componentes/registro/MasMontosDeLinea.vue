<script setup lang="ts">
import { computed } from 'vue';
import { ChevronRight } from 'lucide-vue-next';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { LineaEnEdicion } from '../../composables/documentos/lineas-del-documento';

/** «Más montos de la factura»: plegado, y abierto solo si la línea ya trae un monto o un error de aquí. */
const props = defineProps<{ errores: Record<string, string> }>();
const linea = defineModel<LineaEnEdicion>({ required: true });

const abierto = computed(() => !!props.errores.otrosImpuestos || Number(linea.value.otrosImpuestos) > 0);
</script>

<template>
  <details :open="abierto || undefined" class="group rounded-lg ring-1 ring-tierra-200/70 dark:ring-tierra-700">
    <summary
      class="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-tierra-700 focus-visible:outline-2 focus-visible:outline-campo-500 dark:text-tierra-200 [&::-webkit-details-marker]:hidden"
    >
      <ChevronRight class="size-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden="true" />
      Más montos de la factura
    </summary>
    <div class="grid gap-3 px-3 pt-1 pb-3 sm:grid-cols-2">
      <CampoTexto
        v-model="linea.otrosImpuestos"
        tipo="number"
        paso="any"
        etiqueta="Otros impuestos (tasa municipal, turismo, timbre…) (Q)"
        ayuda="Si la factura trae un impuesto que no es IVA ni IDP, escríbalo aquí. Ya está incluido en el total y no paga IVA."
        :error="errores.otrosImpuestos"
      />
    </div>
  </details>
</template>
