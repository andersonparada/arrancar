<script setup lang="ts">
import { ref } from 'vue';
import { Eye, FileUp, Trash2 } from 'lucide-vue-next';
import { descripcionDelDocumento, huellaCorta, type DescripcionDeDocumento } from '../../utilidades/documentos';
import { formatearFechaHora } from '../../utilidades/formato';
import BotonBase from '../BotonBase.vue';

/**
 * Un documento de respaldo (PDF o foto) con sus datos y sus acciones. Solo muestra y avisa: quien lo usa sube,
 * quita y decide qué acciones permite (`puedeSubir`, `puedeQuitar`) según lo que diga el servidor.
 */
const props = defineProps<{
  titulo: string;
  archivo: DescripcionDeDocumento | null;
  /** Lo que acepta el selector de archivos, p. ej. `application/pdf`. */
  aceptar: string;
  puedeSubir: boolean;
  puedeQuitar: boolean;
  /** Se muestra el botón «Ver». */
  puedeVer?: boolean;
  enviando?: boolean;
  error?: string;
  textoVacio: string;
  textoDeSubir: string;
  /** Una línea con los topes, bajo el botón de subir. */
  ayuda?: string;
}>();
const emit = defineEmits<{ subir: [archivo: File]; quitar: []; ver: [] }>();

const selector = ref<HTMLInputElement | null>(null);

/** Entrega el archivo y limpia el selector, para poder volver a elegir el mismo. */
function alElegir(): void {
  const elegido = selector.value?.files?.[0];
  if (elegido) emit('subir', elegido);
  if (selector.value) selector.value.value = '';
}
</script>

<template>
  <section class="space-y-2" :aria-label="titulo">
    <h3 class="text-sm font-semibold text-tierra-800 dark:text-tierra-100">{{ titulo }}</h3>
    <div v-if="archivo" class="space-y-0.5 text-sm">
      <p class="break-words font-medium">{{ archivo.nombreOriginal ?? titulo }}</p>
      <p class="text-tierra-600 dark:text-tierra-300">{{ descripcionDelDocumento(archivo) }}</p>
      <p class="text-tierra-600 dark:text-tierra-300">
        Subido {{ formatearFechaHora(archivo.subidoEn) }}
        <template v-if="archivo.subidoPorNombre">por {{ archivo.subidoPorNombre }}</template>
      </p>
      <p class="text-xs text-tierra-500" title="Huella del archivo (SHA-256)">
        Huella: <span class="font-mono">{{ huellaCorta(archivo.sha256) }}</span>
      </p>
    </div>
    <p v-else class="text-sm text-tierra-500">{{ textoVacio }}</p>

    <div class="flex flex-wrap gap-2 print:hidden">
      <BotonBase v-if="archivo && puedeVer" variante="secundario" pequeno :icono="Eye" @click="emit('ver')">
        Ver
      </BotonBase>
      <BotonBase
        v-if="puedeSubir"
        variante="secundario"
        pequeno
        :icono="FileUp"
        :cargando="props.enviando"
        @click="selector?.click()"
      >
        {{ textoDeSubir }}
      </BotonBase>
      <BotonBase
        v-if="archivo && puedeQuitar"
        variante="fantasma"
        pequeno
        :icono="Trash2"
        :deshabilitado="props.enviando"
        @click="emit('quitar')"
      >
        Quitar
      </BotonBase>
      <input
        v-if="puedeSubir"
        ref="selector"
        type="file"
        :accept="aceptar"
        class="hidden"
        :aria-label="textoDeSubir"
        @change="alElegir"
      />
    </div>
    <p v-if="puedeSubir && ayuda" class="text-xs text-tierra-500 print:hidden">{{ ayuda }}</p>
    <p v-if="error" role="alert" class="text-sm font-medium text-red-700 dark:text-red-400">{{ error }}</p>
  </section>
</template>
