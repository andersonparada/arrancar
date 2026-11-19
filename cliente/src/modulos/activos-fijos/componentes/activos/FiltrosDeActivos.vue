<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { FiltrosDeLaLista } from '../../composables/activos/filtros-de-activos';

defineProps<{ opcionesDeClase: OpcionDeRegistro[] }>();
const filtros = defineModel<FiltrosDeLaLista>({ required: true });

const OPCIONES_DE_ESTADO = [
  { valor: '' as const, texto: 'Todos' },
  { valor: 'en_construccion' as const, texto: 'En construcción' },
  { valor: 'en_uso' as const, texto: 'En uso' },
  { valor: 'dado_de_baja' as const, texto: 'Dados de baja' },
];
const OPCIONES_DE_TIPO = [
  { valor: '' as const, texto: 'Todos' },
  { valor: 'activo' as const, texto: 'Activos fijos' },
  { valor: 'bien_de_control' as const, texto: 'Bienes de control' },
  { valor: 'de_terceros' as const, texto: 'Bienes de terceros' },
];
const OPCIONES_DE_MARCA = [
  { valor: '' as const, texto: 'Todos' },
  { valor: 'ocioso' as const, texto: 'Ociosos' },
  { valor: 'bodega' as const, texto: 'En bodega' },
];
</script>

<template>
  <TarjetaBase class="mb-4">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <CampoTexto v-model="filtros.texto" etiqueta="Buscar" placeholder="Código, descripción, serie o placa" />
      <CampoSelector v-model="filtros.estado" etiqueta="Estado" :opciones="OPCIONES_DE_ESTADO" />
      <CampoSelector v-model="filtros.tipoDeRegistro" etiqueta="Tipo" :opciones="OPCIONES_DE_TIPO" />
      <CampoSelector v-model="filtros.claseId" etiqueta="Clase" :opciones="opcionesDeClase" />
      <CampoSelector v-model="filtros.marca" etiqueta="Marca" :opciones="OPCIONES_DE_MARCA" />
    </div>
  </TarjetaBase>
</template>
