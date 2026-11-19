<script setup lang="ts">
import { RouterLink } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import { rangoDeChequera } from '../../composables/chequeras/detalles-de-chequera';
import type { Chequera } from '../../servicios/chequeras.api';

/** Con qué se imprimen los cheques de una chequera: un formato de la cuenta, una plantilla de fábrica o ninguno. */
defineProps<{
  chequera: Chequera | null;
  opciones: OpcionBuscable<string>[];
  enviando: boolean;
  errores: Record<string, string>;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const valor = defineModel<string>({ required: true });
</script>

<template>
  <VentanaModal
    :abierta="!!chequera"
    :titulo="`Formato de impresión de la chequera ${chequera ? rangoDeChequera(chequera) : ''}`"
    @cerrar="emit('cerrar')"
  >
    <form id="form-formato-de-chequera" class="space-y-4" @submit.prevent="emit('guardar')">
      <CampoSelector
        v-model="valor"
        etiqueta="Se imprimen con"
        :opciones="opciones"
        :error="errores.formatoDeChequeId ?? errores.plantillaDeCheque"
      />
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        El formato dice dónde cae cada dato en el papel. Sin formato no se pueden imprimir los cheques de esta chequera.
        Cambiarlo no afecta a los cheques ya impresos: su historia guarda el formato que se usó.
      </p>
      <RouterLink
        v-permiso="'bancos.formatos-de-cheque.ver'"
        :to="{ name: 'bancos.formatos-de-cheque' }"
        class="text-sm font-medium text-campo-700 hover:underline dark:text-campo-400"
      >
        Administrar los formatos de cheque
      </RouterLink>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-formato-de-chequera" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
