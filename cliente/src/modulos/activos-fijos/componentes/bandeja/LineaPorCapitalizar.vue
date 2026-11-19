<script setup lang="ts">
import { computed } from 'vue';
import { Split } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { sinRepartirDeLaLinea, type EdicionDeAsignacion } from '../../composables/bandeja/edicion-de-capitalizacion';
import { nombreDeLinea } from '../../composables/bandeja/textos-de-bandeja';
import type { usarCatalogosDeCapitalizacion } from '../../composables/bandeja/usar-catalogos-de-capitalizacion';
import type { LineaDeBandeja } from '../../servicios/bandeja.api';
import ParteDeLinea from './ParteDeLinea.vue';

/**
 * Una línea elegida con sus partes. Muestra cuánto falta repartir: lo que no se reparta sigue en la bandeja, así
 * que se puede capitalizar una parte hoy y el resto después.
 */
const props = defineProps<{
  linea: LineaDeBandeja;
  partes: EdicionDeAsignacion[];
  errores: Record<string, string>;
  catalogos: ReturnType<typeof usarCatalogosDeCapitalizacion>;
}>();
const emit = defineEmits<{ repartir: []; quitar: [clave: number] }>();
const sinRepartir = computed(() => sinRepartirDeLaLinea(props.linea, props.partes));
</script>

<template>
  <section class="space-y-3" :aria-label="nombreDeLinea(linea)">
    <header>
      <h3 class="font-semibold wrap-break-word">{{ nombreDeLinea(linea) }}</h3>
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        {{ linea.descripcion || linea.conceptoNombre }} · pendiente
        <strong class="tabular-nums">{{ formatearMonto(linea.pendiente) }}</strong>
      </p>
    </header>
    <ParteDeLinea
      v-for="(parte, indice) in partes"
      :key="parte.clave"
      :model-value="parte"
      :linea="linea"
      :errores="errores"
      :catalogos="catalogos"
      :numero="indice + 1"
      :puede-quitar="partes.length > 1"
      @quitar="emit('quitar', parte.clave)"
    />
    <div class="flex flex-wrap items-center justify-between gap-2" aria-live="polite">
      <p class="text-sm tabular-nums">
        Sin repartir: <strong>{{ formatearMonto(sinRepartir) }}</strong>
        <span v-if="sinRepartir !== '0.00'" class="text-tierra-500"> (queda en la bandeja)</span>
      </p>
      <BotonBase variante="secundario" pequeno :icono="Split" @click="emit('repartir')">
        Repartir en otro destino
      </BotonBase>
    </div>
  </section>
</template>
