<script setup lang="ts">
import { CircleCheck, Lightbulb } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearFecha, formatearFechaHora, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import { nombreDelImpuesto } from '../../composables/retenciones/datos-de-retenciones';
import type { RetencionPorResolver } from '../../servicios/retenciones.api';
import {
  ACCIONES_SUGERIDAS,
  RESOLUCIONES_RESUELTAS,
  VENTANA_POR_RESOLVER as textos,
} from '../../textos-de-retenciones';
import CeldaDeDocumento from './CeldaDeDocumento.vue';

/** Una retención de un documento anulado: qué tiene (constancia, entero), qué hacer y cómo quedó si ya se resolvió. */
defineProps<{ retencion: RetencionPorResolver }>();
defineEmits<{ resolver: [] }>();
</script>

<template>
  <li
    class="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <CeldaDeDocumento :retencion="retencion" />
      <p class="text-right text-sm">
        <strong class="tabular-nums">{{ formatearMonto(retencion.retenido) }}</strong>
        <span class="block text-xs text-tierra-600 dark:text-tierra-300">
          {{ nombreDelImpuesto(retencion) }} · {{ formatearFecha(retencion.fecha) }}
        </span>
      </p>
    </div>
    <p v-if="retencion.motivoDeAnulacionDelDocumento" class="break-words text-sm text-tierra-600 dark:text-tierra-300">
      Motivo de la anulación: {{ retencion.motivoDeAnulacionDelDocumento }}
    </p>
    <div class="flex flex-wrap gap-2 text-xs">
      <InsigniaBase :tono="retencion.constanciaNumero ? 'trigo' : 'tierra'">
        {{ retencion.constanciaNumero ? `Constancia ${retencion.constanciaNumero}` : 'Sin constancia' }}
      </InsigniaBase>
      <InsigniaBase :tono="retencion.enterada ? 'trigo' : 'tierra'">
        {{ retencion.enterada ? 'Mes ya pagado a la SAT' : 'Mes sin pagar' }}
      </InsigniaBase>
    </div>

    <div
      v-if="retencion.resolucion === 'pendiente'"
      class="flex items-start gap-2 rounded-lg bg-trigo-300/30 p-3 text-sm dark:bg-trigo-500/10"
    >
      <Lightbulb class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p class="font-medium">{{ ACCIONES_SUGERIDAS[retencion.accionSugerida].titulo }}</p>
        <p class="text-tierra-700 dark:text-tierra-200">{{ ACCIONES_SUGERIDAS[retencion.accionSugerida].detalle }}</p>
      </div>
    </div>
    <div v-else class="flex items-start gap-2 rounded-lg bg-campo-50 p-3 text-sm dark:bg-campo-950/40">
      <CircleCheck class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div class="min-w-0">
        <p class="font-medium">{{ RESOLUCIONES_RESUELTAS[retencion.resolucion] }}</p>
        <p class="break-words">{{ formatearTexto(retencion.nota) }}</p>
        <p class="text-xs text-tierra-600 dark:text-tierra-300">
          {{ formatearFechaHora(retencion.resueltaEn)
          }}<template v-if="retencion.resueltaPor"> · {{ retencion.resueltaPor }}</template>
        </p>
      </div>
    </div>

    <BotonBase
      v-permiso="'libro-de-compras.retenciones.constancias'"
      class="self-start"
      :variante="retencion.resolucion === 'pendiente' ? 'primario' : 'secundario'"
      @click="$emit('resolver')"
    >
      {{ retencion.resolucion === 'pendiente' ? textos.resolver : textos.cambiar }}
    </BotonBase>
  </li>
</template>
