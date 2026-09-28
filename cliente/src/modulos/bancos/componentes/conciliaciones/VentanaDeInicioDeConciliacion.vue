<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';

/** Pide el periodo (propuesto por el composable) y el saldo del estado de cuenta. */
defineProps<{ abierta: boolean; enviando: boolean; errores: Record<string, string> }>();
const emit = defineEmits<{ cerrar: []; iniciar: [] }>();
const anio = defineModel<number>('anio', { required: true });
const mes = defineModel<number>('mes', { required: true });
const saldoSegunBanco = defineModel<string>('saldoSegunBanco', { required: true });
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Nueva conciliación" @cerrar="emit('cerrar')">
    <form id="form-inicio-conciliacion" class="space-y-4" @submit.prevent="emit('iniciar')">
      <div class="grid grid-cols-2 gap-3">
        <CampoTexto v-model="anio" etiqueta="Año" tipo="number" requerido :error="errores.anio" />
        <CampoTexto v-model="mes" etiqueta="Mes (1 a 12)" tipo="number" requerido :error="errores.mes" />
      </div>
      <CampoTexto
        v-model="saldoSegunBanco"
        etiqueta="Saldo según el estado de cuenta"
        tipo="number"
        paso="any"
        requerido
        :error="errores.saldoSegunBanco"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-inicio-conciliacion" :cargando="enviando">Iniciar</BotonBase>
    </template>
  </VentanaModal>
</template>
