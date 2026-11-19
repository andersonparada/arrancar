<script setup lang="ts">
import { ClipboardCheck, HandCoins, Lock, RefreshCw } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import type { Fondo } from '../servicios/tipos-de-fondos';
import EnlaceComoBoton from './EnlaceComoBoton.vue';

/**
 * Las acciones de todos los días con el dinero del fondo: reponer y arquear (páginas propias), entregar un vale y
 * cerrar. Solo con el fondo abierto y el permiso de cada una; el servidor valida las reglas al enviar.
 */
defineProps<{ fondo: Fondo }>();
const emit = defineEmits<{ entregarVale: []; cerrar: [] }>();
</script>

<template>
  <template v-if="fondo.estado === 'abierto'">
    <EnlaceComoBoton
      v-permiso="'caja-chica.reposiciones.crear'"
      variante="primario"
      :icono="RefreshCw"
      :to="{ name: 'caja-chica.fondos.reponer', params: { id: fondo.id } }"
    >
      Reponer
    </EnlaceComoBoton>
    <EnlaceComoBoton
      v-permiso="'caja-chica.arqueos.crear'"
      :icono="ClipboardCheck"
      :to="{ name: 'caja-chica.fondos.arqueo', params: { id: fondo.id } }"
    >
      Arquear
    </EnlaceComoBoton>
    <BotonBase
      v-permiso="'caja-chica.vales.crear'"
      variante="secundario"
      :icono="HandCoins"
      @click="emit('entregarVale')"
    >
      Entregar vale
    </BotonBase>
    <BotonBase v-permiso="'caja-chica.fondos.cerrar'" variante="fantasma" :icono="Lock" @click="emit('cerrar')">
      Cerrar fondo
    </BotonBase>
  </template>
</template>
