<script setup lang="ts">
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import ElegirMetodoDeCosteo from '../componentes/costeo/ElegirMetodoDeCosteo.vue';
import HistoriaDelMetodo from '../componentes/costeo/HistoriaDelMetodo.vue';
import { usarPoliticaDeCosteo } from '../composables/metodo-de-costeo/usar-politica-de-costeo';
import { VENTANAS_INVENTARIOS } from '../textos';

const ventana = VENTANAS_INVENTARIOS.politicaDeCosteo;
const { politica, cargando, elegido, enviando, resumen, sePuedeElegir, hayCambio, guardar } = usarPoliticaDeCosteo();
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" />
    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <template v-else-if="politica && resumen">
      <TarjetaBase>
        <p class="text-xs text-tierra-500">Método de costeo</p>
        <p class="text-lg font-semibold">{{ resumen.titulo }}</p>
        <p class="mt-1 text-sm text-tierra-600 dark:text-tierra-300">{{ resumen.explicacion }}</p>
      </TarjetaBase>
      <div v-if="sePuedeElegir" v-permiso="'inventarios.metodo-de-costeo.elegir'">
        <ElegirMetodoDeCosteo
          v-model="elegido"
          :actual="politica.metodo"
          :hay-cambio="hayCambio"
          :enviando="enviando"
          @guardar="guardar"
        />
      </div>
      <HistoriaDelMetodo :historia="politica.historia" />
    </template>
  </div>
</template>
