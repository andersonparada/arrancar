<script setup lang="ts">
import { HandCoins, Scissors } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import type { FichaDelDocumento } from '../servicios/tipos';

/** Los botones de una nota de crédito con saldo a favor; aparecen si el servidor dice que se puede (`puede…`). */
defineProps<{ ficha: FichaDelDocumento; abriendo: boolean }>();
defineEmits<{ aplicar: []; ajustar: [] }>();
</script>

<template>
  <BotonBase
    v-if="ficha.puedeAplicar"
    v-permiso="'cuentas-por-pagar.documentos.aplicar-notas'"
    :icono="HandCoins"
    :cargando="abriendo"
    @click="$emit('aplicar')"
  >
    Aplicar a otro documento
  </BotonBase>
  <BotonBase
    v-if="ficha.puedeAjustar"
    v-permiso="'cuentas-por-pagar.ajustes.crear'"
    variante="secundario"
    :icono="Scissors"
    @click="$emit('ajustar')"
  >
    Ajustar saldo
  </BotonBase>
</template>
