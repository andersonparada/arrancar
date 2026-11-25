<script setup lang="ts">
import { computed } from 'vue';
import { Gavel, Replace, Undo2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { estadoDelDocumento } from '../composables/documento-anulado/documento-anulado';
import type { Comprobante } from '../servicios/tipos-de-comprobantes';

/**
 * Lo que pasó con un documento que su emisor anuló después de gastar, y qué se puede hacer: resolverlo o llevarlo a
 * disputa. Aparece aunque el fondo ya esté cerrado, porque resolverlo no mueve el efectivo.
 */
const props = defineProps<{ comprobante: Comprobante }>();
const emit = defineEmits<{ resolver: []; disputa: []; retirarDisputa: [] }>();

const estado = computed(() => estadoDelDocumento(props.comprobante));
const situacion = computed(() => props.comprobante.seguimiento?.situacion ?? null);
</script>

<template>
  <div
    v-if="estado"
    class="space-y-2 rounded-2xl bg-tierra-100/70 p-3 dark:bg-tierra-800/70"
    role="group"
    aria-label="Documento anulado por su emisor"
  >
    <InsigniaBase :tono="estado.tono">{{ estado.texto }}</InsigniaBase>
    <p v-for="linea in estado.lineas" :key="linea" class="text-sm break-words">{{ linea }}</p>
    <div
      v-if="situacion !== 'resuelto' && comprobante.estado === 'vigente'"
      v-permiso="'caja-chica.comprobantes.resolver'"
      class="flex flex-wrap gap-2"
    >
      <BotonBase pequeno :icono="Replace" @click="emit('resolver')">Resolver</BotonBase>
      <BotonBase
        v-if="situacion === 'por_resolver'"
        variante="secundario"
        pequeno
        :icono="Gavel"
        @click="emit('disputa')"
      >
        No reconozco la anulación
      </BotonBase>
      <BotonBase v-else variante="secundario" pequeno :icono="Undo2" @click="emit('retirarDisputa')">
        Retirar la disputa
      </BotonBase>
    </div>
  </div>
</template>
