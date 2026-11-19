<script setup lang="ts">
import { Inbox, SearchX } from 'lucide-vue-next';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import BarraDeAsignacion from '../componentes/BarraDeAsignacion.vue';
import FiltrosDeLaBandeja from '../componentes/FiltrosDeLaBandeja.vue';
import TarjetaDeDocumentoDeBandeja from '../componentes/TarjetaDeDocumentoDeBandeja.vue';
import VentanaDeAsignacion from '../componentes/VentanaDeAsignacion.vue';
import { MAXIMO_POR_ASIGNACION, usarBandeja } from '../composables/comprobantes/usar-bandeja';
import { VENTANAS_CAJA_CHICA } from '../textos';

const ventana = VENTANAS_CAJA_CHICA.bandeja;
const bandeja = usarBandeja();
const { asignacion, filtro, fondoId, seleccion } = bandeja;
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" />

    <p v-if="bandeja.cargando.value && bandeja.total.value === 0" class="text-sm text-tierra-500" role="status">
      Cargando…
    </p>
    <EstadoVacio
      v-else-if="bandeja.total.value === 0"
      :icono="Inbox"
      titulo="No hay facturas por asignar"
      descripcion="Las facturas que se registren en el libro de compras con destino a Caja chica, sin elegir un fondo, llegan aquí. También puede agregarlas desde la ficha de un fondo."
    />
    <template v-else>
      <FiltrosDeLaBandeja
        v-model="filtro"
        :proveedores="bandeja.proveedores.value"
        :filtros="bandeja.filtros.value"
        @limpiar="bandeja.limpiarFiltros"
      />
      <EstadoVacio
        v-if="bandeja.visibles.value.length === 0"
        :icono="SearchX"
        titulo="Ninguna factura cumple los filtros"
        descripcion="Quite algún filtro para ver las facturas de la bandeja."
      />
      <template v-else>
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <label class="flex w-fit cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              class="size-5 rounded border-tierra-300 text-campo-600 focus:ring-campo-500"
              :checked="bandeja.todosMarcados.value"
              @change="bandeja.alternarTodos"
            />
            Marcar todos los que se pueden asignar (hasta {{ MAXIMO_POR_ASIGNACION }})
          </label>
          <p class="text-sm text-tierra-600 dark:text-tierra-300" aria-live="polite">
            {{ bandeja.visibles.value.length }} de {{ bandeja.total.value }} facturas
          </p>
        </div>
        <ul class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" :aria-busy="bandeja.cargando.value">
          <li v-for="documento in bandeja.visibles.value" :key="documento.id">
            <TarjetaDeDocumentoDeBandeja
              :documento="documento"
              :marcado="seleccion.includes(documento.id)"
              @alternar="bandeja.alternar(documento.id)"
            />
          </li>
        </ul>
      </template>
      <BarraDeAsignacion
        v-model:fondo-id="fondoId"
        v-permiso="'caja-chica.comprobantes.crear'"
        :cantidad="bandeja.marcados.value.length"
        :fondos="bandeja.fondos.value.elementos"
        @asignar="bandeja.asignar"
        @limpiar="seleccion = []"
      />
    </template>

    <VentanaDeAsignacion
      v-model="asignacion.edicion.value"
      :abierta="asignacion.abierta.value"
      :enviando="asignacion.enviando.value"
      :errores="asignacion.errores.value"
      :fondo="asignacion.destino.value?.nombre ?? ''"
      :resumen="asignacion.resumen.value"
      :hay-retencion="asignacion.hayRetencion.value"
      @cerrar="asignacion.cerrar"
      @guardar="asignacion.guardar"
    />
  </div>
</template>
