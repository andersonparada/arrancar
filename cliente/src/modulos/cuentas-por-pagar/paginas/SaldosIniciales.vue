<script setup lang="ts">
import { computed } from 'vue';
import { Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import AvisoDeSaldosIniciales from '../componentes/saldos-iniciales/AvisoDeSaldosIniciales.vue';
import CuadreDeSaldosIniciales from '../componentes/saldos-iniciales/CuadreDeSaldosIniciales.vue';
import EstadoDeLaCargaInicial from '../componentes/saldos-iniciales/EstadoDeLaCargaInicial.vue';
import ListaDeSaldosIniciales from '../componentes/saldos-iniciales/ListaDeSaldosIniciales.vue';
import VentanaDeEliminacionDeSaldo from '../componentes/saldos-iniciales/VentanaDeEliminacionDeSaldo.vue';
import VentanaDeSaldoInicial from '../componentes/saldos-iniciales/VentanaDeSaldoInicial.vue';
import {
  opcionesDeProveedorParaFiltro,
  resumenDeEliminacionDeSaldo,
} from '../composables/saldos-iniciales/detalles-de-saldo-inicial';
import { usarSaldosIniciales } from '../composables/saldos-iniciales/usar-saldos-iniciales';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_PAGAR.saldosIniciales;
const pantalla = usarSaldosIniciales();
const { formulario, eliminacion, intercambio, situacion, cuadre } = pantalla;

// Cargar o importar solo tiene sentido con la carga abierta; exportar se puede siempre.
const permisos = computed(() => ({
  exportar: 'cuentas-por-pagar.saldos-iniciales.exportar',
  ...(situacion.value?.puedeCargar ? { importar: 'cuentas-por-pagar.saldos-iniciales.importar' } : {}),
}));
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio
        :permisos="permisos"
        nombre="saldos iniciales"
        @exportar="intercambio.exportar()"
        @importar="intercambio.abrir"
      />
      <BotonBase
        v-if="situacion?.puedeCargar"
        v-permiso="'cuentas-por-pagar.saldos-iniciales.crear'"
        :icono="Plus"
        @click="formulario.cargar"
      >
        {{ ventana.nuevo }}
      </BotonBase>
    </EncabezadoPagina>

    <EstadoDeLaCargaInicial v-if="situacion" :situacion="situacion" />
    <CuadreDeSaldosIniciales
      v-if="cuadre.datos.value"
      :cuadre="cuadre.datos.value"
      @exportar="pantalla.intercambioDelCuadre.exportar()"
    />

    <div class="mb-4 max-w-sm">
      <CampoSelector
        v-model="pantalla.proveedorId.value"
        etiqueta="Proveedor"
        :opciones="opcionesDeProveedorParaFiltro(pantalla.proveedores.value)"
      />
    </div>
    <ListaDeSaldosIniciales
      v-model:pagina="pantalla.pagina.value"
      :saldos="pantalla.saldos.value"
      :cargando="pantalla.cargando.value"
      :filtrando="pantalla.proveedorId.value !== ''"
      :paginas="pantalla.paginas.value"
      :limite="pantalla.limite"
      :total="pantalla.total.value"
      @corregir="formulario.corregir"
      @eliminar="eliminacion.abrir"
    />

    <VentanaDeSaldoInicial
      v-model="formulario.edicion.value"
      :errores="formulario.errores.value"
      :enviando="formulario.enviando.value"
      :proveedores="pantalla.proveedores.value"
      @cerrar="formulario.edicion.value.abierta = false"
      @guardar="formulario.guardar"
    />
    <VentanaDeEliminacionDeSaldo
      v-model:motivo="eliminacion.motivo.value"
      :abierta="!!eliminacion.saldo.value"
      :resumen="eliminacion.saldo.value ? resumenDeEliminacionDeSaldo(eliminacion.saldo.value) : ''"
      :maximo="eliminacion.maximo"
      :errores="eliminacion.errores.value"
      :enviando="eliminacion.enviando.value"
      @cerrar="eliminacion.cerrar"
      @confirmar="eliminacion.confirmar"
    />
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar saldos iniciales"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    >
      <template #aviso><AvisoDeSaldosIniciales /></template>
    </VentanaDeImportacion>
  </div>
</template>
