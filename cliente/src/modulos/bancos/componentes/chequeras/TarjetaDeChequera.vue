<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { INSIGNIA_DE_APERTURA } from '../../composables/comunes/de-apertura';
import { detallesDeChequera, rangoDeChequera } from '../../composables/chequeras/detalles-de-chequera';
import type { Chequera } from '../../servicios/chequeras.api';

/** La chequera en la ficha de la cuenta: su rango y conteos, "Ver cheques" e inactivar o reactivar (la de la carga inicial no se inactiva). */
const props = defineProps<{ registro: Chequera }>();
const emit = defineEmits<{ 'cambiar-estado': [] }>();

const textoDeEstado = computed(() => (props.registro.activa ? 'Inactivar' : 'Reactivar'));
</script>

<template>
  <TarjetaDeRegistro
    :titulo="`Chequera ${rangoDeChequera(registro)}`"
    :detalles="detallesDeChequera(registro)"
    permiso="bancos.chequeras.editar"
    :inactivo="!registro.activa"
    :insignia="registro.deApertura ? INSIGNIA_DE_APERTURA : undefined"
    sin-editar
  >
    <template #acciones-extra>
      <RouterLink
        :to="{ name: 'bancos.chequeras.ficha', params: { chequeraId: registro.id } }"
        class="text-sm font-medium text-campo-700 hover:underline dark:text-campo-400"
      >
        Ver cheques
      </RouterLink>
      <BotonBase
        v-if="!registro.deApertura"
        v-permiso="'bancos.chequeras.editar'"
        variante="fantasma"
        pequeno
        @click="emit('cambiar-estado')"
      >
        {{ textoDeEstado }}
      </BotonBase>
    </template>
  </TarjetaDeRegistro>
</template>
