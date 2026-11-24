<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeMotivo } from '../../composables/compartido/motivo';

/** Una acción que pide el motivo (anular, descartar): dice qué va a pasar y el motivo queda en la auditoría. */
defineProps<{
  titulo: string;
  /** Qué va a pasar si confirma, en una o dos frases. */
  resumen: string;
  textoDelBoton: string;
  enviando: boolean;
  errores: Record<string, string>;
}>();
const edicion = defineModel<EdicionDeMotivo>({ required: true });
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" :titulo="titulo" @cerrar="emit('cerrar')">
    <form id="form-de-motivo" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p class="text-sm" role="note">{{ resumen }}</p>
      <CampoTexto
        v-model="edicion.motivo"
        etiqueta="Motivo"
        requerido
        multilinea
        :longitud-maxima="300"
        contar
        ayuda="Por qué se hace; queda registrado en la auditoría."
        :error="errores.motivo"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-motivo" variante="peligro" :cargando="enviando">
        {{ textoDelBoton }}
      </BotonBase>
    </template>
  </VentanaModal>
</template>
