<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { MAXIMO_DE_LA_NOTA, opcionesDeResolucion, pideNota } from '../../composables/retenciones/datos-de-resolucion';
import { nombreDelDocumento } from '../../composables/retenciones/datos-de-retenciones';
import type { RetencionPorResolver } from '../../servicios/retenciones.api';
import { ACCIONES_SUGERIDAS, VENTANA_POR_RESOLVER as textos } from '../../textos-de-retenciones';

/** Resuelve una retención de un documento anulado: cómo se resolvió y una nota. También sirve para volver a «pendiente». */
defineProps<{
  abierta: boolean;
  retencion: RetencionPorResolver | null;
  enviando: boolean;
  errores: Record<string, string>;
}>();
const resolucion = defineModel<string>('resolucion', { required: true });
const nota = defineModel<string>('nota', { required: true });
defineEmits<{ guardar: []; cerrar: [] }>();

const opciones = opcionesDeResolucion();
const conNota = computed(() => pideNota(resolucion.value));
</script>

<template>
  <VentanaModal :abierta="abierta" :titulo="textos.ventana" @cerrar="$emit('cerrar')">
    <form v-if="retencion" id="resolver-retencion" class="flex flex-col gap-4" @submit.prevent="$emit('guardar')">
      <p class="rounded-lg bg-tierra-100 p-3 text-sm dark:bg-tierra-800">
        <strong>{{ retencion.proveedor.nombre }}</strong> · {{ nombreDelDocumento(retencion.documento) }} ·
        {{ formatearMonto(retencion.retenido) }}
        <span class="mt-1 block text-tierra-700 dark:text-tierra-200">
          {{ ACCIONES_SUGERIDAS[retencion.accionSugerida].titulo }}
        </span>
      </p>
      <CampoSelector
        v-model="resolucion"
        :etiqueta="textos.resolucion"
        :opciones="opciones"
        :error="errores.resolucion"
        requerido
      />
      <CampoTexto
        v-if="conNota || resolucion === ''"
        v-model="nota"
        :etiqueta="textos.nota"
        :ayuda="textos.notaAyuda"
        :error="errores.nota"
        :longitud-maxima="MAXIMO_DE_LA_NOTA"
        multilinea
        requerido
      />
      <p v-else class="text-sm text-tierra-600 dark:text-tierra-300">{{ textos.notaVolver }}</p>
    </form>
    <template #pie>
      <BotonBase variante="secundario" :deshabilitado="enviando" @click="$emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="resolver-retencion" :cargando="enviando">{{ textos.guardar }}</BotonBase>
    </template>
  </VentanaModal>
</template>
