<script setup lang="ts">
import { computed, ref } from 'vue';
import { ExternalLink, FileUp, Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFechaHora } from '@/modulos/core/utilidades/formato';
import {
  ACEPTAR_ESTADO_DE_CUENTA,
  descripcionDelArchivo,
  huellaCorta,
} from '../../composables/conciliaciones/estado-de-cuenta';
import { textoSinEvidencia } from '../../composables/saldos-iniciales/evidencia-de-apertura';
import type { ControlDeEvidencia } from '../../composables/saldos-iniciales/usar-evidencia-de-apertura';
import type { SaldoInicialDeCuenta } from '../../servicios/tipos-de-saldos-iniciales';
import { AYUDA_DE_LA_EVIDENCIA } from '../../textos-de-apertura';

/**
 * El último estado de cuenta o la última conciliación del sistema anterior (PDF o foto), opcional. Se sube, reemplaza
 * y quita solo con la carga abierta (`editable`).
 */
const props = defineProps<{ saldo: SaldoInicialDeCuenta; control: ControlDeEvidencia }>();

const selector = ref<HTMLInputElement | null>(null);
const evidencia = computed(() => props.saldo.evidencia);
const editable = computed(() => props.saldo.puedeEditar);
const descripcion = computed(() => (evidencia.value ? descripcionDelArchivo(evidencia.value) : ''));

/** Entrega el archivo y limpia el selector, para poder volver a elegir el mismo. */
function alElegir(): void {
  const elegido = selector.value?.files?.[0];
  if (elegido) void props.control.subir(elegido);
  if (selector.value) selector.value.value = '';
}
</script>

<template>
  <TarjetaBase class="space-y-3">
    <h3 class="text-base font-semibold">Evidencia de la apertura</h3>
    <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ AYUDA_DE_LA_EVIDENCIA }}</p>
    <div v-if="evidencia" class="space-y-0.5 text-sm">
      <p class="font-medium break-words">{{ evidencia.nombreOriginal ?? 'Evidencia de la apertura' }}</p>
      <p class="text-tierra-600 dark:text-tierra-300">{{ descripcion }}</p>
      <p class="text-tierra-600 dark:text-tierra-300">
        Subido {{ formatearFechaHora(evidencia.subidoEn) }}
        <template v-if="evidencia.subidoPorNombre">por {{ evidencia.subidoPorNombre }}</template>
      </p>
      <p class="text-xs text-tierra-500" title="Huella del archivo (SHA-256)">
        Huella: <span class="font-mono">{{ huellaCorta(evidencia.sha256) }}</span>
      </p>
      <a
        :href="control.direccion"
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-1 font-medium text-campo-700 hover:underline dark:text-campo-400"
      >
        <ExternalLink class="size-4" aria-hidden="true" />
        Abrir en otra pestaña
      </a>
    </div>
    <p v-else class="text-sm text-tierra-500">{{ textoSinEvidencia(editable) }}</p>

    <div v-if="editable" v-permiso="'bancos.saldos-iniciales.editar'" class="flex flex-wrap gap-2">
      <BotonBase variante="secundario" :icono="FileUp" :cargando="control.enviando" @click="selector?.click()">
        {{ evidencia ? 'Reemplazar archivo' : 'Subir evidencia' }}
      </BotonBase>
      <BotonBase
        v-if="evidencia"
        variante="fantasma"
        :icono="Trash2"
        :deshabilitado="control.enviando"
        @click="control.quitar()"
      >
        Quitar
      </BotonBase>
      <input
        ref="selector"
        type="file"
        :accept="ACEPTAR_ESTADO_DE_CUENTA"
        class="hidden"
        aria-label="Elegir la evidencia de la apertura (PDF o foto)"
        @change="alElegir"
      />
    </div>
    <p v-if="control.error" role="alert" class="text-sm font-medium text-red-700 dark:text-red-400">
      {{ control.error }}
    </p>
  </TarjetaBase>
</template>
