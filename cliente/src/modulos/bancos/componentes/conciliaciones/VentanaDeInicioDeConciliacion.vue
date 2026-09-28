<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';

/** Pide el periodo (propuesto por el composable, editable); ningún saldo que escribir. */
defineProps<{ abierta: boolean; enviando: boolean; errores: Record<string, string> }>();
const emit = defineEmits<{ cerrar: []; iniciar: [] }>();
const anio = defineModel<number>('anio', { required: true });
const mes = defineModel<number>('mes', { required: true });
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Nueva conciliación" @cerrar="emit('cerrar')">
    <form id="form-inicio-conciliacion" class="space-y-4" @submit.prevent="emit('iniciar')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        Solo se pueden conciliar meses ya terminados, en orden. Marque los documentos en la siguiente pantalla: el
        sistema arma el documento y calcula los saldos.
      </p>
      <div class="grid grid-cols-2 gap-3">
        <CampoTexto v-model="anio" etiqueta="Año" tipo="number" requerido :error="errores.anio" />
        <CampoTexto v-model="mes" etiqueta="Mes (1 a 12)" tipo="number" requerido :error="errores.mes" />
      </div>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-inicio-conciliacion" :cargando="enviando">Iniciar</BotonBase>
    </template>
  </VentanaModal>
</template>
