<script setup lang="ts">
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import CaminoDelSat2046 from '../componentes/sat-2046/CaminoDelSat2046.vue';
import NotaDelSat2046 from '../componentes/sat-2046/NotaDelSat2046.vue';
import { VENTANA_DEL_SAT_2046 as textos } from '../textos-del-sat-2046';
</script>

<template>
  <div class="min-w-0">
    <EncabezadoPagina
      :titulo="textos.titulo"
      :descripcion="textos.descripcion"
      :volver="{ texto: textos.volver, ruta: { name: 'libro-de-compras.libro' } }"
    />
    <div class="max-w-3xl space-y-3">
      <NotaDelSat2046 :titulo="textos.recordatorioTitulo" :texto="textos.recordatorio" />
      <NotaDelSat2046 :titulo="textos.comprasTitulo" :texto="textos.compras" />
      <NotaDelSat2046 :titulo="textos.calculoTitulo" :texto="textos.calculo" />
      <CaminoDelSat2046 v-for="camino in textos.caminos" :key="camino.clave" :camino="camino" />
      <p class="text-sm text-tierra-700 dark:text-tierra-200">{{ textos.siNoAparece }}</p>
      <p class="text-xs text-tierra-600 dark:text-tierra-300">{{ textos.fuente }}</p>
    </div>
  </div>
</template>
