<script setup lang="ts">
import { Ban, Printer, Shuffle } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import type { FichaDePago } from '../servicios/tipos-de-pagos';

/** Los botones de la ficha: el comprobante siempre; reaplicar y anular solo si el servidor dice que se puede y hay permiso. */
defineProps<{ ficha: FichaDePago }>();
defineEmits<{ comprobante: []; reaplicar: []; anular: [] }>();
</script>

<template>
  <BotonBase variante="secundario" :icono="Printer" @click="$emit('comprobante')">Comprobante</BotonBase>
  <span v-if="ficha.puedeReaplicar" v-permiso="'cuentas-por-pagar.pagos.reaplicar'" class="contents">
    <BotonBase variante="secundario" :icono="Shuffle" @click="$emit('reaplicar')">Reaplicar</BotonBase>
  </span>
  <span v-if="ficha.puedeAnular" v-permiso="'cuentas-por-pagar.pagos.anular'" class="contents">
    <BotonBase variante="peligro" :icono="Ban" @click="$emit('anular')">Anular</BotonBase>
  </span>
</template>
