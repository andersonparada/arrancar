<script setup lang="ts">
import { computed } from 'vue';
import { RotateCcw } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import {
  faltaElMotivo,
  montoFueraDeRango,
  type AjustesEnEdicion,
} from '../../composables/documentos/ajustes-de-retenciones';
import { cifrasDeRetencion, nombreDeRetencion } from '../../composables/documentos/detalles-de-retencion';
import type { RetencionDeDocumento } from '../../servicios/documentos.api';
import { AYUDA_DE_AJUSTAR_RETENCION } from '../../textos-del-registro';

/** Una retención que propone el sistema, con la posibilidad (según el permiso) de cambiar su monto con un motivo. */
const props = defineProps<{ retencion: RetencionDeDocumento }>();
const ajustes = defineModel<AjustesEnEdicion>({ required: true });

const ajuste = computed(() => ajustes.value[props.retencion.regla]);
const errorDelMonto = computed(() =>
  ajuste.value && montoFueraDeRango(ajuste.value, props.retencion)
    ? `Debe estar entre 0.00 y ${props.retencion.base} (la base).`
    : undefined,
);
const errorDelMotivo = computed(() =>
  ajuste.value && faltaElMotivo(ajuste.value, props.retencion)
    ? 'Escriba por qué cambia el monto de la retención.'
    : undefined,
);

function ajustar(monto: string): void {
  ajustes.value = { ...ajustes.value, [props.retencion.regla]: { monto, motivo: '' } };
}

function dejarLoPropuesto(): void {
  ajustes.value = Object.fromEntries(
    Object.entries(ajustes.value).filter(([regla]) => regla !== props.retencion.regla),
  );
}
</script>

<template>
  <div
    class="space-y-3 rounded-xl bg-tierra-50 p-3 ring-1 ring-tierra-200/70 dark:bg-tierra-900/40 dark:ring-tierra-700"
  >
    <div class="flex flex-wrap items-start justify-between gap-2">
      <p class="min-w-0 text-sm font-medium">{{ nombreDeRetencion(retencion) }}</p>
      <InsigniaBase v-if="ajuste" tono="trigo">Con ajuste</InsigniaBase>
    </div>
    <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      <div v-for="cifra in cifrasDeRetencion(retencion).slice(0, 4)" :key="cifra.etiqueta" class="min-w-0">
        <dt class="text-xs text-tierra-500">{{ cifra.etiqueta }}</dt>
        <dd class="tabular-nums">{{ cifra.valor }}</dd>
      </div>
    </dl>

    <div v-permiso="'libro-de-compras.retenciones.ajustar'" class="space-y-3">
      <div v-if="!ajuste" class="flex flex-wrap gap-2">
        <BotonBase variante="secundario" pequeno @click="ajustar(retencion.montoPropuesto)">Ajustar el monto</BotonBase>
        <BotonBase variante="secundario" pequeno @click="ajustar('0.00')">No retener</BotonBase>
      </div>
      <div v-else class="space-y-3">
        <p class="text-xs text-tierra-600 dark:text-tierra-300">{{ AYUDA_DE_AJUSTAR_RETENCION }}</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <CampoTexto
            v-model="ajuste.monto"
            tipo="number"
            paso="any"
            etiqueta="Monto a retener (Q)"
            requerido
            :error="errorDelMonto"
          />
          <CampoTexto
            v-model="ajuste.motivo"
            etiqueta="Motivo del cambio"
            requerido
            :longitud-maxima="300"
            :error="errorDelMotivo"
          />
        </div>
        <BotonBase variante="fantasma" pequeno :icono="RotateCcw" @click="dejarLoPropuesto"
          >Dejar lo propuesto</BotonBase
        >
      </div>
    </div>
  </div>
</template>
