<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';

/**
 * Los botones de impresión de un cheque: solo aparecen los que el servidor dice que se pueden y a quien tiene el
 * permiso. «Imprimir» lleva a la vista previa; «Reimprimir» y «Pasar a otro formulario» (o «Papel extraviado», si solo se puede declarar así) abren su ventana.
 */
defineProps<{
  puedeImprimir: boolean;
  puedeReimprimir: boolean;
  puedePasarAOtroFormulario: boolean;
  puedeDeclararExtraviado: boolean;
  impreso: boolean;
}>();
const emit = defineEmits<{ imprimir: []; reimprimir: []; pasar: []; historial: [] }>();
</script>

<template>
  <BotonBase
    v-if="puedeImprimir"
    v-permiso="'bancos.cheques.imprimir'"
    variante="fantasma"
    pequeno
    @click="emit('imprimir')"
  >
    Imprimir
  </BotonBase>
  <BotonBase
    v-if="puedeReimprimir"
    v-permiso="'bancos.cheques.reimprimir'"
    variante="fantasma"
    pequeno
    @click="emit('reimprimir')"
  >
    Reimprimir
  </BotonBase>
  <BotonBase v-if="impreso" v-permiso="'bancos.cheques.ver'" variante="fantasma" pequeno @click="emit('historial')">
    Impresiones
  </BotonBase>
  <BotonBase
    v-if="puedePasarAOtroFormulario || puedeDeclararExtraviado"
    v-permiso="'bancos.cheques.anular'"
    variante="fantasma"
    pequeno
    @click="emit('pasar')"
  >
    {{ puedePasarAOtroFormulario ? 'Pasar a otro formulario' : 'Papel extraviado' }}
  </BotonBase>
</template>
