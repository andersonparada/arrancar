<script setup lang="ts">
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import CamposDeSalida from '../componentes/documentos/CamposDeSalida.vue';
import SeccionDeRenglones from '../componentes/documentos/SeccionDeRenglones.vue';
import { usarFormularioDeSalida } from '../composables/documentos/usar-formulario-de-salida';
import { VENTANAS_INVENTARIOS } from '../textos';

const router = useRouter();
const ventana = VENTANAS_INVENTARIOS.salida;
const { edicion, catalogo, destinos, opcionesDeBodegas, enviando, errores, renglones, guardar } =
  usarFormularioDeSalida();
const volver = {
  texto: `Volver a ${VENTANAS_INVENTARIOS.movimientos.titulo}`,
  ruta: { name: 'inventarios.movimientos' },
};
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="guardar">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" :volver="volver" />
    <TarjetaBase>
      <CamposDeSalida
        v-model="edicion"
        :errores="errores"
        :opciones-de-bodegas="opcionesDeBodegas"
        :conceptos="destinos.conceptos.value"
        :localidades="destinos.localidades.value"
        :departamentos="destinos.departamentos.value"
        :ver-localidades="destinos.verLocalidades"
        :ver-departamentos="destinos.verDepartamentos"
      />
    </TarjetaBase>
    <TarjetaBase>
      <SeccionDeRenglones
        :renglones="edicion.renglones"
        :catalogo="catalogo"
        :errores="errores"
        :con-costo="false"
        @agregar="renglones.agregar"
        @quitar="renglones.quitar"
        @elegir-articulo="renglones.alElegirArticulo"
        @leer="renglones.leerCodigo"
      />
    </TarjetaBase>
    <div class="flex justify-end gap-2">
      <BotonBase variante="secundario" @click="router.push(volver.ruta)">Cancelar</BotonBase>
      <BotonBase tipo="submit" :cargando="enviando">Registrar salida</BotonBase>
    </div>
  </form>
</template>
