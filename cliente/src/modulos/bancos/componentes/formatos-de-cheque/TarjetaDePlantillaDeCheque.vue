<script setup lang="ts">
import { Plus } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { PlantillaDeCheque } from '../../servicios/tipos-de-formatos-de-cheque';

/** Una plantilla de fábrica: sirve de punto de partida y se puede probar tal cual, sin guardar nada. */
const props = defineProps<{ plantilla: PlantillaDeCheque }>();
const emit = defineEmits<{ crear: [] }>();
const destinoDeLaPrueba = () => ({
  name: 'bancos.formatos-de-cheque.prueba',
  query: { plantilla: props.plantilla.clave },
});
</script>

<template>
  <TarjetaBase class="flex h-full flex-col gap-2">
    <p class="font-semibold">{{ plantilla.nombre }}</p>
    <p class="text-xs text-tierra-500">
      Papel de {{ plantilla.formato.papel.anchoMm }} × {{ plantilla.formato.papel.altoMm }} mm
    </p>
    <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ plantilla.descripcion }}</p>
    <div class="mt-auto flex flex-wrap items-center justify-end gap-1">
      <RouterLink
        v-permiso="'bancos.formatos-de-cheque.ver'"
        :to="destinoDeLaPrueba()"
        class="inline-flex items-center rounded-lg px-2 py-1 text-sm font-medium text-campo-700 hover:underline dark:text-campo-400"
      >
        Prueba de alineación
      </RouterLink>
      <BotonBase
        v-permiso="'bancos.formatos-de-cheque.crear'"
        variante="secundario"
        pequeno
        :icono="Plus"
        @click="emit('crear')"
      >
        Crear un formato
      </BotonBase>
    </div>
  </TarjetaBase>
</template>
