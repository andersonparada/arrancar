<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';

/** Cambiar el vencimiento de un cargo; mientras no esté pagado del todo se puede mover. */
defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<{ abierta: boolean; vencimiento: string }>({ required: true });
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Cambiar el vencimiento" @cerrar="emit('cerrar')">
    <form id="form-vencimiento" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <CampoTexto
        v-model="edicion.vencimiento"
        etiqueta="Vence"
        tipo="date"
        requerido
        ayuda="No puede ser anterior a la fecha de emisión."
        :error="errores.vencimiento"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-vencimiento" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
