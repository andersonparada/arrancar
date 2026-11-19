<script setup lang="ts">
import { SearchX, Truck } from 'lucide-vue-next';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { detallesDelPlazo } from '../composables/plazos/reglas-de-plazos';
import { usarPlazos } from '../composables/plazos/usar-plazos';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_PAGAR.plazos;
const PERMISOS_DE_INTERCAMBIO = {
  importar: 'cuentas-por-pagar.condiciones.importar',
  exportar: 'cuentas-por-pagar.condiciones.exportar',
};
const { registros, total, cargando, busqueda, intercambio } = usarPlazos();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio
        :permisos="PERMISOS_DE_INTERCAMBIO"
        @exportar="intercambio.exportar"
        @importar="intercambio.abrir"
      />
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio
      v-else-if="!total"
      :icono="Truck"
      titulo="Todavía no hay proveedores"
      descripcion="Registre proveedores en Terceros; después podrá cambiar sus plazos aquí desde Excel."
    />
    <template v-else>
      <div class="mb-4 max-w-md">
        <CampoTexto v-model="busqueda" etiqueta="Buscar proveedor" tipo="search" placeholder="Nombre o NIT" />
        <p class="mt-1 text-xs text-tierra-500" aria-live="polite">{{ registros.length }} de {{ total }} proveedores</p>
      </div>
      <EstadoVacio
        v-if="!registros.length"
        :icono="SearchX"
        titulo="Ningún proveedor coincide"
        descripcion="Revise lo escrito: puede buscar por una parte del nombre o del NIT."
      />
      <ul v-else class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <li v-for="plazo in registros" :key="plazo.proveedorId">
          <TarjetaDeRegistro
            :titulo="plazo.proveedorNombre"
            :detalles="detallesDelPlazo(plazo)"
            permiso="terceros.ver"
            solo-lectura
          />
        </li>
      </ul>
    </template>

    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar plazos de proveedores"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
