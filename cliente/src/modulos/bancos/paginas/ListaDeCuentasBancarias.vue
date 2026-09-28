<script setup lang="ts">
import { Inbox, Plus } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { detallesDeCuentaBancaria } from '../composables/cuentas-bancarias/detalles-de-cuenta-bancaria';
import { usarListaDeCuentasBancarias } from '../composables/cuentas-bancarias/usar-lista-de-cuentas-bancarias';
import { VENTANAS_BANCOS } from '../textos';

const ventana = VENTANAS_BANCOS.cuentasBancarias;
const PERMISOS_DE_INTERCAMBIO = {
  importar: 'bancos.cuentas-bancarias.importar',
  exportar: 'bancos.cuentas-bancarias.exportar',
};
const router = useRouter();
const { registros, cargando, intercambio } = usarListaDeCuentasBancarias();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio
        :permisos="PERMISOS_DE_INTERCAMBIO"
        @exportar="intercambio.exportar"
        @importar="intercambio.abrir"
      />
      <BotonBase
        v-permiso="'bancos.cuentas-bancarias.gestionar'"
        :icono="Plus"
        @click="router.push({ name: 'bancos.cuentas-bancarias.nuevo' })"
      >
        {{ ventana.nuevo }}
      </BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!registros.length" :icono="Inbox" titulo="Todavía no hay cuentas bancarias" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeRegistro
          :titulo="String(registro.nombre)"
          :detalles="detallesDeCuentaBancaria(registro)"
          permiso="bancos.cuentas-bancarias.gestionar"
          :inactivo="!registro.activo"
          :destino="{ name: 'bancos.cuentas-bancarias.ficha', params: { cuentaBancariaId: registro.id } }"
        >
          <template #destacado>
            <p class="text-sm font-semibold text-tierra-700 dark:text-tierra-200">
              {{ formatearMonto(registro.saldo) }}
            </p>
          </template>
        </TarjetaDeRegistro>
      </li>
    </ul>
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar cuentas bancarias"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
