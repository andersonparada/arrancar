<script setup lang="ts">
import { ArrowLeftRight, Banknote, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';

/** Los botones para registrar una nota, una transferencia o emitir un cheque. */
defineEmits<{ credito: []; debito: []; transferencia: []; cheque: [] }>();
</script>

<template>
  <BotonBase v-permiso="'bancos.movimientos.gestionar'" variante="secundario" :icono="Plus" @click="$emit('credito')">
    Nota de crédito
  </BotonBase>
  <BotonBase v-permiso="'bancos.movimientos.gestionar'" :icono="Plus" @click="$emit('debito')">
    Nota de débito
  </BotonBase>
  <BotonBase
    v-permiso="'bancos.transferencias.gestionar'"
    variante="secundario"
    :icono="ArrowLeftRight"
    @click="$emit('transferencia')"
  >
    Transferencia
  </BotonBase>
  <BotonBase v-permiso="'bancos.cheques.emitir'" variante="secundario" :icono="Banknote" @click="$emit('cheque')">
    Emitir cheque
  </BotonBase>
</template>
