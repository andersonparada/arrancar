<script setup lang="ts">
import { usarApariencia } from '../almacenes/apariencia';

const apariencia = usarApariencia();
</script>

<template>
  <img :src="apariencia.urlLogo" :alt="`Logo de ${apariencia.nombreAplicacion}`" class="object-contain" />
</template>
