<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeSaldoInicial } from '../../composables/saldos-iniciales/edicion-de-saldo-inicial';
import {
  AYUDA_DE_LIBROS_ANTERIORES,
  AYUDA_DE_SEPARAR,
  AYUDA_DEL_SALDO_DEL_BANCO,
  ETIQUETA_DE_LIBROS_ANTERIORES,
} from '../../textos-de-apertura';

/**
 * La cabecera de la cuenta: el saldo según el estado de cuenta a la fecha de corte y, solo para comparar, el saldo de
 * la cuenta contable en los libros anteriores. Con el saldo «de antes» la misma ventana lo separa en partidas.
 */
const props = defineProps<{ errores: Record<string, string>; enviando: boolean; corte: string; nuevo: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeSaldoInicial>({ required: true });

const titulo = computed(() => {
  if (edicion.value.separando) return 'Separar el saldo en partidas';
  return props.nuevo ? 'Registrar saldo inicial' : 'Corregir saldo inicial';
});
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" :titulo="titulo" @cerrar="emit('cerrar')">
    <form id="form-saldo-inicial" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p v-if="edicion.separando" class="text-sm text-tierra-600 dark:text-tierra-300">{{ AYUDA_DE_SEPARAR }}</p>
      <CampoTexto
        v-model="edicion.saldoSegunEstadoDeCuenta"
        :etiqueta="`Saldo según el estado de cuenta al ${corte}`"
        tipo="number"
        paso="any"
        requerido
        :ayuda="AYUDA_DEL_SALDO_DEL_BANCO"
        :error="errores.saldoSegunEstadoDeCuenta"
      />
      <CampoTexto
        v-model="edicion.saldoSegunLibrosAnteriores"
        :etiqueta="ETIQUETA_DE_LIBROS_ANTERIORES"
        tipo="number"
        paso="any"
        :ayuda="AYUDA_DE_LIBROS_ANTERIORES"
        :error="errores.saldoSegunLibrosAnteriores"
      />
      <CampoTexto v-model="edicion.observaciones" etiqueta="Observaciones" multilinea :error="errores.observaciones" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-saldo-inicial" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
