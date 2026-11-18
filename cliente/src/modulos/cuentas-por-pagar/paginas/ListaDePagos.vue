<script setup lang="ts">
import { Banknote, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import FiltrosDePagos from '../componentes/FiltrosDePagos.vue';
import PaginacionDeLista from '../componentes/PaginacionDeLista.vue';
import { detallesDeLaFila, marcaDeLaFila } from '../composables/pagos/lista-de-pagos';
import { usarPagos } from '../composables/pagos/usar-pagos';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

/** Los pagos hechos a proveedores: filtros (con cheques posfechados) y una tarjeta por pago que lleva a su ficha. */
const ventana = VENTANAS_CUENTAS_POR_PAGAR.pagos;
const lista = usarPagos();
const rutaDeNuevo = { name: 'cuentas-por-pagar.pagos.nuevo' };
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcionDeLaLista">
      <BotonBase v-if="lista.puedeNuevo.value" :icono="Plus" @click="$router.push(rutaDeNuevo)">
        {{ ventana.nuevo }}
      </BotonBase>
    </EncabezadoPagina>

    <FiltrosDePagos
      v-model="lista.filtros"
      :proveedores="lista.proveedores.value"
      :cuentas="lista.cuentas.value"
      @quitar="lista.quitarFiltros"
    />

    <p v-if="lista.cargando.value && lista.pagos.value.length === 0" class="text-sm text-tierra-500" role="status">
      Cargando…
    </p>
    <EstadoVacio
      v-else-if="lista.pagos.value.length === 0"
      :icono="Banknote"
      titulo="No hay pagos con estos filtros"
      descripcion="Un pago entrega dinero a un proveedor y baja el saldo de sus facturas. Quite los filtros o registre uno nuevo."
    >
      <div class="flex flex-wrap justify-center gap-2">
        <BotonBase variante="secundario" @click="lista.quitarFiltros">Quitar filtros</BotonBase>
        <BotonBase v-if="lista.puedeNuevo.value" :icono="Plus" @click="$router.push(rutaDeNuevo)">
          {{ ventana.nuevo }}
        </BotonBase>
      </div>
    </EstadoVacio>
    <template v-else>
      <ul
        class="grid grid-cols-1 gap-3 transition-opacity md:grid-cols-2 xl:grid-cols-3"
        :class="{ 'opacity-60': lista.cargando.value }"
        :aria-busy="lista.cargando.value"
      >
        <li v-for="pago in lista.pagos.value" :key="pago.id">
          <TarjetaDeRegistro
            :titulo="`Pago ${pago.numero}`"
            :detalles="detallesDeLaFila(pago)"
            permiso="cuentas-por-pagar.pagos.ver"
            :insignia="marcaDeLaFila(pago)"
            :class="{ 'opacity-80': pago.estado === 'anulado' }"
            :destino="{ name: 'cuentas-por-pagar.pagos.ficha', params: { id: pago.id } }"
            solo-lectura
          />
        </li>
      </ul>
      <PaginacionDeLista
        v-model="lista.pagina.value"
        :paginas="lista.paginas.value"
        :limite="lista.limite"
        :total="lista.total.value"
      />
    </template>
  </div>
</template>
