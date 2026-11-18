<script setup lang="ts">
import { computed } from 'vue';
import { Download } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearFecha, formatearFechaHora } from '@/modulos/core/utilidades/formato';
import { huellaCorta } from '@/modulos/core/utilidades/documentos';
import { textoDelConteo } from '../composables/revision-de-cierre';
import type { CierreGuardado } from '../servicios/cierre-de-carga.tipos';
import RevisionDeModulos from './RevisionDeModulos.vue';

/** La revisión de un cierre tal como la vio quien cerró: solo lectura, con su motivo, el balance y el Excel. */
const props = defineProps<{ cierre: CierreGuardado | null; exportando: boolean }>();
const emit = defineEmits<{ cerrar: []; exportar: [cierreId: string] }>();

const conteo = computed(() => textoDelConteo(props.cierre?.diferencias ?? 0, props.cierre?.avisos ?? 0));
</script>

<template>
  <VentanaModal :abierta="cierre !== null" titulo="Revisión del cierre" ancha encima="maxima" @cerrar="emit('cerrar')">
    <div v-if="cierre" class="space-y-4">
      <div class="space-y-1 text-sm">
        <p>
          Cerrada el {{ formatearFechaHora(cierre.cerradaEn)
          }}<template v-if="cierre.cerradaPor"> por {{ cierre.cerradaPor }}</template
          >. Fecha de inicio: {{ formatearFecha(cierre.fechaDeInicio) }}.
        </p>
        <p class="font-semibold">{{ conteo }}</p>
        <p v-if="cierre.motivo" class="break-words"><span class="font-medium">Motivo:</span> {{ cierre.motivo }}</p>
        <p v-if="cierre.balanceDeApertura" class="break-words text-tierra-600 dark:text-tierra-300">
          Balance de apertura: {{ cierre.balanceDeApertura.nombreOriginal ?? 'sin nombre' }} ({{
            cierre.balanceDeApertura.paginas
          }}
          pág., huella {{ huellaCorta(cierre.balanceDeApertura.sha256) }}).
        </p>
        <p v-else class="text-tierra-600 dark:text-tierra-300">Se cerró sin balance de apertura adjunto.</p>
      </div>
      <RevisionDeModulos :modulos="cierre.modulos" />
    </div>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cerrar</BotonBase>
      <BotonBase
        v-if="cierre"
        v-permiso="'empresas.carga-inicial.exportar'"
        :icono="Download"
        :cargando="exportando"
        @click="emit('exportar', cierre.id)"
      >
        Exportar a Excel
      </BotonBase>
    </template>
  </VentanaModal>
</template>
