<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { CLASE_DE_TIPO, SIGNO_DE_TIPO, detallesDeNota, tituloDeNota } from '../../composables/notas/detalles-de-nota';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { esDeSoloLectura } from '../../composables/movimientos/estado-de-reversion';
import { insigniaDeNota, ofreceMarcar, sePuedeCorregir } from '../../composables/notas/marca-de-nota';
import type { Movimiento } from '../../servicios/movimientos.api';

/**
 * La tarjeta de una nota. «Anular», «Eliminar», «Marcar» y «Desmarcar» aparecen solo si el servidor dice que se
 * puede; lo revertido y los inversos se ven, con su marca, pero ya no se tocan, y lo que generó otro módulo no
 * se corrige (la tarjeta lo explica).
 */
const props = defineProps<{ registro: Movimiento }>();
const emit = defineEmits<{ editar: []; anular: []; eliminar: []; marcar: []; desmarcar: [] }>();

const sesion = usarSesion();
const insignia = computed(() => insigniaDeNota(props.registro));
const conMarcar = computed(() => ofreceMarcar(props.registro, sesion.moduloActivo('cuentas-por-pagar')));
</script>

<template>
  <TarjetaDeRegistro
    :titulo="tituloDeNota(registro)"
    :detalles="detallesDeNota(registro)"
    permiso="bancos.notas.editar"
    :insignia="insignia"
    :solo-lectura="esDeSoloLectura(registro)"
    :sin-editar="!sePuedeCorregir(registro)"
    @editar="emit('editar')"
  >
    <template #destacado>
      <p class="text-sm font-semibold" :class="CLASE_DE_TIPO[registro.tipo as 'credito' | 'debito']">
        {{ SIGNO_DE_TIPO[registro.tipo as 'credito' | 'debito'] }} {{ formatearMonto(registro.monto) }}
      </p>
    </template>
    <template #acciones-extra>
      <BotonBase v-if="conMarcar" v-permiso="'bancos.notas.editar'" variante="fantasma" pequeno @click="emit('marcar')">
        Marcar
      </BotonBase>
      <BotonBase
        v-if="registro.puedeDesmarcar"
        v-permiso="'bancos.notas.editar'"
        variante="fantasma"
        pequeno
        @click="emit('desmarcar')"
      >
        Desmarcar
      </BotonBase>
      <BotonBase
        v-if="registro.puedeAnular"
        v-permiso="'bancos.notas.anular'"
        variante="fantasma"
        pequeno
        @click="emit('anular')"
      >
        Anular
      </BotonBase>
      <BotonBase
        v-if="registro.puedeEliminar"
        v-permiso="'bancos.notas.eliminar'"
        variante="fantasma"
        pequeno
        @click="emit('eliminar')"
      >
        Eliminar
      </BotonBase>
    </template>
  </TarjetaDeRegistro>
</template>
