<script setup lang="ts">
import { ArrowDownToLine, ArrowUpFromLine, Ban, Pencil, UserRoundCog } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import type { Fondo } from '../servicios/tipos-de-fondos';

/** Las acciones del fondo. Solo se ven las que el servidor dice que se pueden hacer y el usuario tiene permiso de hacer. */
defineProps<{ fondo: Fondo }>();
const emit = defineEmits<{ editar: []; aumentar: []; disminuir: []; custodio: []; anular: [] }>();
</script>

<template>
  <BotonBase
    v-if="fondo.puedeEditar"
    v-permiso="'caja-chica.fondos.editar'"
    variante="secundario"
    :icono="Pencil"
    @click="emit('editar')"
  >
    Editar
  </BotonBase>
  <BotonBase
    v-if="fondo.puedeAumentar"
    v-permiso="'caja-chica.fondos.cambiar-monto'"
    :icono="ArrowUpFromLine"
    @click="emit('aumentar')"
  >
    Aumentar
  </BotonBase>
  <BotonBase
    v-if="fondo.puedeDisminuir"
    v-permiso="'caja-chica.fondos.cambiar-monto'"
    variante="secundario"
    :icono="ArrowDownToLine"
    @click="emit('disminuir')"
  >
    Disminuir
  </BotonBase>
  <BotonBase
    v-if="fondo.puedeCambiarCustodio"
    v-permiso="'caja-chica.fondos.editar'"
    variante="secundario"
    :icono="UserRoundCog"
    @click="emit('custodio')"
  >
    Cambiar custodio
  </BotonBase>
  <BotonBase
    v-if="fondo.puedeAnularApertura"
    v-permiso="'caja-chica.fondos.cerrar'"
    variante="fantasma"
    :icono="Ban"
    @click="emit('anular')"
  >
    Anular apertura
  </BotonBase>
</template>
