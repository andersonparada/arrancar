<script setup lang="ts">
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import CamposDeEntrada from '../componentes/documentos/CamposDeEntrada.vue';
import SeccionDeRenglones from '../componentes/documentos/SeccionDeRenglones.vue';
import { usarFormularioDeEntrada } from '../composables/documentos/usar-formulario-de-entrada';
import { VENTANAS_INVENTARIOS } from '../textos';

const router = useRouter();
const ventana = VENTANAS_INVENTARIOS.entrada;
const { edicion, catalogo, opcionesDeBodegas, enviando, errores, esDonacion, renglones, guardar } =
  usarFormularioDeEntrada();
const volver = {
  texto: `Volver a ${VENTANAS_INVENTARIOS.movimientos.titulo}`,
  ruta: { name: 'inventarios.movimientos' },
};
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="guardar">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" :volver="volver" />
    <TarjetaBase>
      <CamposDeEntrada
        v-model="edicion"
        :errores="errores"
        :opciones-de-bodegas="opcionesDeBodegas"
        :es-donacion="esDonacion"
      />
    </TarjetaBase>
    <TarjetaBase>
      <SeccionDeRenglones
        :renglones="edicion.renglones"
        :catalogo="catalogo"
        :errores="errores"
        con-costo
        @agregar="renglones.agregar"
        @quitar="renglones.quitar"
        @elegir-articulo="renglones.alElegirArticulo"
        @leer="renglones.leerCodigo"
      />
    </TarjetaBase>
    <div class="flex justify-end gap-2">
      <BotonBase variante="secundario" @click="router.push(volver.ruta)">Cancelar</BotonBase>
      <BotonBase tipo="submit" :cargando="enviando">Registrar entrada</BotonBase>
    </div>
  </form>
</template>
