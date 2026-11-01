<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';

/** Lo que se ve mientras la sección no tiene datos: cargando o, si falló la lectura, cómo seguir. */
defineProps<{ cargando: boolean; fallo: boolean }>();
defineEmits<{ reintentar: [] }>();
</script>

<template>
  <div aria-live="polite">
    <p v-if="cargando" class="text-sm text-tierra-500" role="status">Cargando condiciones de pago…</p>
    <div v-else-if="fallo" class="space-y-2 rounded-lg border border-red-300 p-3 dark:border-red-800" role="alert">
      <p class="text-sm text-red-700 dark:text-red-300">
        No se pudieron cargar las condiciones de pago. Lo que ya está guardado no se cambia si guarda ahora; vuelva a
        intentarlo para verlas y editarlas.
      </p>
      <BotonBase variante="secundario" @click="$emit('reintentar')">Reintentar</BotonBase>
    </div>
  </div>
</template>
