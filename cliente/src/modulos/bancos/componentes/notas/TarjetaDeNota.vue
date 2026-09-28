<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { CLASE_DE_TIPO, SIGNO_DE_TIPO, detallesDeNota, tituloDeNota } from '../../composables/notas/detalles-de-nota';
import type { Movimiento } from '../../servicios/movimientos.api';

const props = defineProps<{ registro: Movimiento }>();
const emit = defineEmits<{ editar: []; anular: [] }>();

const insignia = computed(() => (props.registro.anuladoEn ? 'Anulado' : undefined));
</script>

<template>
  <TarjetaDeRegistro
    :titulo="tituloDeNota(registro)"
    :detalles="detallesDeNota(registro)"
    permiso="bancos.notas.gestionar"
    :insignia="insignia"
    :solo-lectura="!!registro.anuladoEn"
    @editar="emit('editar')"
  >
    <template #destacado>
      <p class="text-sm font-semibold" :class="CLASE_DE_TIPO[registro.tipo as 'credito' | 'debito']">
        {{ SIGNO_DE_TIPO[registro.tipo as 'credito' | 'debito'] }} {{ formatearMonto(registro.monto) }}
      </p>
    </template>
    <template #acciones-extra>
      <BotonBase v-permiso="'bancos.notas.anular'" variante="fantasma" pequeno @click="emit('anular')">
        Anular
      </BotonBase>
    </template>
  </TarjetaDeRegistro>
</template>
