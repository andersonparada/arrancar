<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeLote } from '../../composables/articulos/edicion-de-lote';

/** Un lote nuevo del artículo; el vencimiento es obligatorio si el artículo lo maneja. */
defineProps<{ errores: Record<string, string>; enviando: boolean; vencimientoObligatorio: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeLote>({ required: true });
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Registrar lote" @cerrar="emit('cerrar')">
    <form id="form-lote" class="space-y-4" @submit.prevent="emit('guardar')">
      <CampoTexto
        v-model="edicion.codigo"
        etiqueta="Código del lote"
        requerido
        sin-correccion
        :error="errores.codigo"
      />
      <CampoTexto
        v-model="edicion.fechaDeVencimiento"
        etiqueta="Fecha de vencimiento"
        tipo="date"
        :requerido="vencimientoObligatorio"
        :error="errores.fechaDeVencimiento"
      />
      <CampoTexto
        v-model="edicion.fechaDeFabricacion"
        etiqueta="Fecha de fabricación"
        tipo="date"
        :error="errores.fechaDeFabricacion"
      />
      <CampoTexto v-model="edicion.observaciones" etiqueta="Observaciones" multilinea :error="errores.observaciones" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-lote" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
