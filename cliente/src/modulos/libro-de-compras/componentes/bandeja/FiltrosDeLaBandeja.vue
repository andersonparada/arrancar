<script setup lang="ts">
import { FilterX } from 'lucide-vue-next';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import {
  cantidadDeFiltrosDeLaBandeja,
  opcionesDeProveedor,
  opcionesDeTipoDeDte,
  type FiltrosDeLaBandeja,
} from '../../composables/bandeja/datos-de-la-bandeja';

const filtros = defineModel<FiltrosDeLaBandeja>({ required: true });
defineEmits<{ quitar: [] }>();
const tipos = opcionesDeTipoDeDte();
const proveedores = opcionesDeProveedor(usarSesion().puede('proveedores.crear'));
</script>

<template>
  <TarjetaBase class="mb-4">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <CampoTexto
        v-model="filtros.busqueda"
        etiqueta="Buscar"
        tipo="search"
        placeholder="Número, NIT o nombre"
        class="sm:col-span-2 lg:col-span-1"
      />
      <CampoSelector v-model="filtros.tipoDte" etiqueta="Tipo" :opciones="tipos" />
      <CampoSelector v-model="filtros.proveedor" etiqueta="Proveedor" :opciones="proveedores" />
      <CampoTexto v-model="filtros.desde" etiqueta="Emitido desde" tipo="date" />
      <CampoTexto v-model="filtros.hasta" etiqueta="Emitido hasta" tipo="date" />
    </div>
    <div v-if="cantidadDeFiltrosDeLaBandeja(filtros) > 0" class="mt-3 flex justify-end">
      <BotonBase variante="fantasma" pequeno :icono="FilterX" @click="$emit('quitar')">Quitar filtros</BotonBase>
    </div>
  </TarjetaBase>
</template>
