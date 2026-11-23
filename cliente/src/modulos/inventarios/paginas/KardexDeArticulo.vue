<script setup lang="ts">
import { Inbox, Package } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import FiltrosDelKardex from '../componentes/existencias/FiltrosDelKardex.vue';
import SeccionDeExistenciasPorBodega from '../componentes/existencias/SeccionDeExistenciasPorBodega.vue';
import TarjetaDeRenglonDeKardex from '../componentes/existencias/TarjetaDeRenglonDeKardex.vue';
import { usarKardexDeArticulo } from '../composables/existencias/usar-kardex-de-articulo';

const props = defineProps<{ articuloId: string }>();

const router = useRouter();
const { filtros, kardex, cargandoElKardex, existencias, cargandoLasExistencias, opcionesDeBodegas, veTodas } =
  usarKardexDeArticulo(props.articuloId);
const volver = { texto: 'Volver a Existencias', ruta: { name: 'inventarios.existencias' } };
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina
      :titulo="kardex?.articuloNombre ?? 'Kardex del artículo'"
      :descripcion="kardex ? `Código ${kardex.articuloCodigo}` : 'Existencias y movimientos'"
      :volver="volver"
    >
      <BotonBase
        v-permiso="'inventarios.articulos.ver'"
        variante="secundario"
        :icono="Package"
        @click="router.push({ name: 'inventarios.articulos.ficha', params: { articuloId } })"
      >
        Ver el artículo
      </BotonBase>
    </EncabezadoPagina>

    <SeccionDeExistenciasPorBodega :existencias="existencias" :cargando="cargandoLasExistencias" />

    <section aria-labelledby="titulo-kardex" class="space-y-3">
      <h2 id="titulo-kardex" class="font-semibold">Kardex</h2>
      <FiltrosDelKardex v-model="filtros" :opciones-de-bodegas="opcionesDeBodegas" />
      <p v-if="!veTodas" class="text-xs text-tierra-500">
        Ve el kardex de cada una de sus bodegas con su propio saldo; el de toda la empresa es solo para quien ve todas.
      </p>
      <p v-if="cargandoElKardex" class="text-sm text-tierra-500">Cargando…</p>
      <EstadoVacio
        v-else-if="!kardex?.renglones.length"
        :icono="Inbox"
        titulo="Sin movimientos en este período"
        descripcion="Cambie las fechas o la bodega para ver otros movimientos."
      />
      <ul v-else class="space-y-2">
        <li v-for="renglon in kardex.renglones" :key="renglon.movimientoId">
          <TarjetaDeRenglonDeKardex :renglon="renglon" :unidad="kardex.unidadBaseNombre" />
        </li>
      </ul>
    </section>
  </div>
</template>
