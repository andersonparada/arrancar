<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';

/** Lo que se ve mientras la sección fiscal no tiene datos: cargando o, si falló la lectura, cómo seguir. */
defineProps<{ cargando: boolean; fallo: boolean }>();
defineEmits<{ reintentar: [] }>();
</script>

<template>
  <div aria-live="polite">
    <p v-if="cargando" class="text-sm text-tierra-500" role="status">Cargando datos fiscales…</p>
    <div v-else-if="fallo" class="space-y-2 rounded-lg border border-red-300 p-3 dark:border-red-800" role="alert">
      <p class="text-sm text-red-700 dark:text-red-300">
        No se pudieron cargar los datos fiscales. Lo que ya está guardado no se cambia si guarda ahora; vuelva a
        intentarlo para verlos y editarlos.
      </p>
      <BotonBase variante="secundario" @click="$emit('reintentar')">Reintentar</BotonBase>
    </div>
  </div>
</template>
