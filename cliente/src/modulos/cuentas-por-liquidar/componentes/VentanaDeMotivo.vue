<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { MAXIMO_DEL_MOTIVO_DEL_CAMBIO, type EdicionDeCambioConMotivo } from '../composables/usar-cambio-con-motivo';

/** Anular, reabrir o quitar un gasto: dice qué va a pasar, pide el motivo (queda en la auditoría) y, si mueve dinero, la fecha en Bancos. */
defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeCambioConMotivo>({ required: true });
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" :titulo="edicion.titulo" @cerrar="emit('cerrar')">
    <form id="form-cambio-con-motivo" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p class="text-sm">{{ edicion.resumen }}</p>
      <CampoTexto
        v-model="edicion.motivo"
        etiqueta="Motivo"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO_DEL_CAMBIO"
        ayuda="Por qué se hace; queda registrado en la auditoría."
        :error="errores.motivo"
      />
      <CampoTexto
        v-if="edicion.conFecha"
        v-model="edicion.fecha"
        etiqueta="Fecha del movimiento en Bancos"
        tipo="date"
        ayuda="Opcional. Si la deja en blanco, Bancos la decide; revise que ese mes no esté conciliado."
        :error="errores.fecha"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase
        tipo="submit"
        form="form-cambio-con-motivo"
        :variante="edicion.peligroso ? 'peligro' : 'primario'"
        :cargando="enviando"
      >
        {{ edicion.textoDelBoton }}
      </BotonBase>
    </template>
  </VentanaModal>
</template>
