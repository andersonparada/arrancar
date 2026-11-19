<script setup lang="ts">
import { Plus, WalletCards } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import { usarChequeras } from '../../composables/chequeras/usar-chequeras';
import ListaDeTarjetasDeChequeras from './ListaDeTarjetasDeChequeras.vue';
import VentanaDeChequera from './VentanaDeChequera.vue';

/** La sección de chequeras en la ficha de la cuenta bancaria: lista, "Nueva chequera" e inactivar o reactivar. */
const props = defineProps<{ cuentaBancariaId: string }>();
const { chequeras, cargando, cambiarEstado, edicion, enviando, errores, nueva, guardar } = usarChequeras(
  props.cuentaBancariaId,
);
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold text-tierra-700 dark:text-tierra-200">Chequeras</h2>
      <BotonBase v-permiso="'bancos.chequeras.crear'" variante="secundario" :icono="Plus" pequeno @click="nueva">
        Nueva chequera
      </BotonBase>
    </div>
    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!chequeras.length" :icono="WalletCards" titulo="Todavía no hay chequeras" />
    <ListaDeTarjetasDeChequeras v-else :chequeras="chequeras" @cambiar-estado="cambiarEstado" />
    <VentanaDeChequera
      v-model="edicion"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
  </div>
</template>
