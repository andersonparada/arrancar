<script setup lang="ts">
import { Plus } from 'lucide-vue-next';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import TarjetaDeEmpresa from '../componentes/TarjetaDeEmpresa.vue';
import VentanaDeEmpresa from '../componentes/VentanaDeEmpresa.vue';
import { usarEmpresas } from '../composables/usar-empresas';
import { VENTANAS_EMPRESAS } from '../textos';

const sesion = usarSesion();
const {
  empresas,
  edicion,
  enviando,
  errores,
  abrir,
  guardar,
  carga,
  motivo,
  reaperturaAbierta,
  enviandoCierre,
  erroresDeReapertura,
  enviandoReapertura,
  cerrar,
  abrirReapertura,
  reabrir,
} = usarEmpresas();
</script>

<template>
  <div>
    <EncabezadoPagina
      :titulo="VENTANAS_EMPRESAS.empresas.titulo"
      :descripcion="VENTANAS_EMPRESAS.empresas.descripcion(sesion.empresa?.cuentaNombre ?? '')"
    >
      <BotonBase v-permiso="'empresas.crear'" :icono="Plus" @click="abrir()">Nueva empresa</BotonBase>
    </EncabezadoPagina>

    <ul class="grid gap-3 md:grid-cols-2">
      <li v-for="empresa in empresas" :key="empresa.id">
        <TarjetaDeEmpresa :empresa="empresa" :en-uso="empresa.id === sesion.empresa?.id" @editar="abrir(empresa)" />
      </li>
    </ul>

    <VentanaDeEmpresa
      v-model="edicion"
      v-model:motivo="motivo"
      :errores="errores"
      :enviando="enviando"
      :carga="carga"
      :enviando-cierre="enviandoCierre"
      :errores-de-reapertura="erroresDeReapertura"
      :enviando-reapertura="enviandoReapertura"
      :reapertura-abierta="reaperturaAbierta"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
      @cerrar-carga="cerrar"
      @abrir-reapertura="abrirReapertura"
      @cancelar-reapertura="reaperturaAbierta = false"
      @reabrir="reabrir"
    />
  </div>
</template>
