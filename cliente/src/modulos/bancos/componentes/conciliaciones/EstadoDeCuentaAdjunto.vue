<script setup lang="ts">
import { computed, ref } from 'vue';
import { FileUp, Trash2 } from 'lucide-vue-next';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFechaHora } from '@/modulos/core/utilidades/formato';
import {
  ACEPTAR_ESTADO_DE_CUENTA,
  descripcionDelArchivo,
  huellaCorta,
} from '../../composables/conciliaciones/estado-de-cuenta';
import type { Conciliacion } from '../../servicios/conciliaciones.api';

/** El PDF o foto del estado de cuenta: quien elabora lo sube, lo reemplaza o lo quita mientras está en proceso. */
const props = defineProps<{ conciliacion: Conciliacion; enviando?: boolean; error?: string }>();
const emit = defineEmits<{ subir: [archivo: File]; quitar: [] }>();

const sesion = usarSesion();
const selector = ref<HTMLInputElement | null>(null);
const archivo = computed(() => props.conciliacion.estadoDeCuenta);
const editable = computed(
  () => props.conciliacion.estado === 'en_proceso' && sesion.puede('bancos.conciliaciones.conciliar'),
);

/** Entrega el archivo y limpia el selector, para poder volver a elegir el mismo. */
function alElegir(): void {
  const elegido = selector.value?.files?.[0];
  if (elegido) emit('subir', elegido);
  if (selector.value) selector.value.value = '';
}
</script>

<template>
  <TarjetaBase class="space-y-3">
    <h3 class="text-base font-semibold">Estado de cuenta adjunto</h3>
    <div v-if="archivo" class="space-y-0.5 text-sm">
      <p class="break-words font-medium">{{ archivo.nombreOriginal ?? 'Estado de cuenta' }}</p>
      <p class="text-tierra-600 dark:text-tierra-300">{{ descripcionDelArchivo(archivo) }}</p>
      <p class="text-tierra-600 dark:text-tierra-300">
        Subido {{ formatearFechaHora(archivo.subidoEn) }}
        <template v-if="archivo.subidoPorNombre">por {{ archivo.subidoPorNombre }}</template>
      </p>
      <p class="text-xs text-tierra-500" title="Huella del archivo (SHA-256)">
        Huella: <span class="font-mono">{{ huellaCorta(archivo.sha256) }}</span>
      </p>
    </div>
    <p v-else class="text-sm text-tierra-500">
      {{
        editable
          ? 'Aún no hay archivo. Suba el PDF o la foto del estado de cuenta del banco.'
          : 'No se adjuntó archivo.'
      }}
    </p>

    <div v-if="editable" class="flex flex-wrap gap-2 print:hidden">
      <BotonBase variante="secundario" :icono="FileUp" :cargando="enviando" @click="selector?.click()">
        {{ archivo ? 'Reemplazar archivo' : 'Subir estado de cuenta' }}
      </BotonBase>
      <BotonBase v-if="archivo" variante="fantasma" :icono="Trash2" :deshabilitado="enviando" @click="emit('quitar')">
        Quitar
      </BotonBase>
      <input
        ref="selector"
        type="file"
        :accept="ACEPTAR_ESTADO_DE_CUENTA"
        class="hidden"
        aria-label="Elegir el estado de cuenta (PDF o foto)"
        @change="alElegir"
      />
    </div>
    <p v-if="editable && !archivo" class="text-xs text-tierra-500 print:hidden">
      PDF hasta 10 MB o foto JPEG, PNG o WebP hasta 15 MB. Un solo archivo.
    </p>
    <p v-if="error" role="alert" class="text-sm font-medium text-red-700 dark:text-red-400 print:hidden">
      {{ error }}
    </p>
  </TarjetaBase>
</template>
