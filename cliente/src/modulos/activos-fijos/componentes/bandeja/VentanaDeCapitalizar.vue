<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeAsignacion } from '../../composables/bandeja/edicion-de-capitalizacion';
import type { usarCatalogosDeCapitalizacion } from '../../composables/bandeja/usar-catalogos-de-capitalizacion';
import type { LineaDeBandeja } from '../../servicios/bandeja.api';
import LineaPorCapitalizar from './LineaPorCapitalizar.vue';

/**
 * La ventana «Capitalizar»: cada línea elegida con sus partes (activo nuevo, activo existente o compra conjunta).
 * Abajo dice, antes de confirmar, cuántos activos se crean y por cuánto.
 */
defineProps<{
  abierta: boolean;
  lineas: LineaDeBandeja[];
  partes: EdicionDeAsignacion[];
  errores: Record<string, string>;
  catalogos: ReturnType<typeof usarCatalogosDeCapitalizacion>;
  resumen: string;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; confirmar: []; repartir: [linea: LineaDeBandeja]; quitar: [clave: number] }>();
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Capitalizar líneas" ancha @cerrar="emit('cerrar')">
    <p v-if="catalogos.cargando" class="mb-3 text-sm text-tierra-500" role="status">Cargando clases y activos…</p>
    <form id="form-de-capitalizar" class="space-y-6" novalidate @submit.prevent="emit('confirmar')">
      <LineaPorCapitalizar
        v-for="linea in lineas"
        :key="linea.lineaId"
        :linea="linea"
        :partes="partes.filter((parte) => parte.lineaId === linea.lineaId)"
        :errores="errores"
        :catalogos="catalogos"
        @repartir="emit('repartir', linea)"
        @quitar="emit('quitar', $event)"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-capitalizar" :cargando="enviando">Capitalizar</BotonBase>
      <p
        class="text-sm text-tierra-700 sm:order-first sm:mr-auto sm:self-center dark:text-tierra-200"
        aria-live="polite"
      >
        {{ resumen }}
      </p>
    </template>
  </VentanaModal>
</template>
