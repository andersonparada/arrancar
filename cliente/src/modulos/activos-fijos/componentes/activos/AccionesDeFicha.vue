<script setup lang="ts">
import { ArrowRightLeft, Building2, Hammer, SlidersHorizontal, Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';

/**
 * Los botones de la ficha. Cada uno se ve solo con su permiso; si el servidor no admite la acción en el estado
 * del activo, lo dice al intentarla. Un activo dado de baja no se mueve.
 */
defineProps<{ dadoDeBaja: boolean; esEdificio: boolean }>();
const emit = defineEmits<{ trasladar: []; mejora: []; estimacion: []; matricula: []; baja: [] }>();
</script>

<template>
  <template v-if="!dadoDeBaja">
    <BotonBase v-permiso="'activos-fijos.traslados.crear'" :icono="ArrowRightLeft" @click="emit('trasladar')">
      Trasladar
    </BotonBase>
    <BotonBase v-permiso="'activos-fijos.mejoras.crear'" variante="secundario" :icono="Hammer" @click="emit('mejora')">
      Mejora o costo posterior
    </BotonBase>
    <BotonBase
      v-permiso="'activos-fijos.activos.revisar-estimacion'"
      variante="secundario"
      :icono="SlidersHorizontal"
      @click="emit('estimacion')"
    >
      Revisar estimación
    </BotonBase>
    <BotonBase
      v-if="esEdificio"
      v-permiso="'activos-fijos.activos.revisar-estimacion'"
      variante="secundario"
      :icono="Building2"
      @click="emit('matricula')"
    >
      Cambiar matrícula o catastro
    </BotonBase>
    <BotonBase v-permiso="'activos-fijos.bajas.crear'" variante="peligro" :icono="Trash2" @click="emit('baja')">
      Dar de baja o vender
    </BotonBase>
  </template>
</template>
