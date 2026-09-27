<script setup lang="ts">
import { ref } from 'vue';
import { ImageUp, Sparkles, Trash2 } from 'lucide-vue-next';
import BotonBase from '../BotonBase.vue';
import CampoTexto from '../CampoTexto.vue';
import TarjetaBase from '../TarjetaBase.vue';

defineProps<{ logo: string; tieneLogoPropio: boolean; error?: string }>();
const emit = defineEmits<{ subir: [archivo: File]; quitar: []; sugerirColores: [] }>();
const nombre = defineModel<string>('nombre', { required: true });
const selector = ref<HTMLInputElement | null>(null);

/** Entrega el archivo y limpia el selector, para poder volver a elegir el mismo. */
function alElegir(): void {
  const archivo = selector.value?.files?.[0];
  if (archivo) emit('subir', archivo);
  if (selector.value) selector.value.value = '';
}
</script>

<template>
  <TarjetaBase class="space-y-4">
    <h2 class="font-semibold">Identidad</h2>
    <CampoTexto v-model="nombre" etiqueta="Nombre de la aplicación" requerido :error="error" />

    <div class="flex flex-wrap items-center gap-4">
      <img
        :src="logo"
        alt="Logo actual"
        class="size-16 rounded-xl bg-tierra-100 object-contain p-1.5 dark:bg-tierra-800"
      />
      <div class="flex flex-wrap gap-2">
        <BotonBase variante="secundario" :icono="ImageUp" @click="selector?.click()">Subir logo</BotonBase>
        <BotonBase v-if="tieneLogoPropio" variante="fantasma" :icono="Trash2" @click="emit('quitar')">Quitar</BotonBase>
        <BotonBase variante="fantasma" :icono="Sparkles" @click="emit('sugerirColores')">Colores del logo</BotonBase>
      </div>
      <input
        ref="selector"
        type="file"
        accept="image/svg+xml,image/png,image/jpeg,image/webp"
        class="hidden"
        @change="alElegir"
      />
    </div>
    <p class="text-xs text-tierra-500">
      SVG o PNG con fondo transparente se ven mejor. Se ajusta a un cuadrado de 512 px.
    </p>
  </TarjetaBase>
</template>
