<script setup lang="ts">
import { FileMinus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import FiltrosDeNotasDeCredito from '../componentes/FiltrosDeNotasDeCredito.vue';
import PaginacionDeLista from '../componentes/PaginacionDeLista.vue';
import ResumenDeSaldosAFavor from '../componentes/ResumenDeSaldosAFavor.vue';
import TarjetaDeNotaDeCredito from '../componentes/TarjetaDeNotaDeCredito.vue';
import { usarNotasDeCredito } from '../composables/usar-notas-de-credito';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_PAGAR.notasDeCredito;
const lista = usarNotasDeCredito();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" />

    <FiltrosDeNotasDeCredito
      v-model="lista.filtros"
      :proveedores="lista.proveedores.value"
      @quitar="lista.quitarFiltros"
    />
    <ResumenDeSaldosAFavor :saldos="lista.saldosPorProveedor.value" />

    <p v-if="lista.cargando.value && lista.notas.value.length === 0" class="text-sm text-tierra-500" role="status">
      Cargando…
    </p>
    <EstadoVacio
      v-else-if="lista.notas.value.length === 0"
      :icono="FileMinus"
      titulo="No hay notas de crédito con estos filtros"
      descripcion="Las notas de crédito llegan del libro de compras. Apague «Solo con saldo a favor» para ver también las que ya se usaron."
    >
      <BotonBase variante="secundario" @click="lista.quitarFiltros">Quitar filtros</BotonBase>
    </EstadoVacio>
    <template v-else>
      <ul
        class="grid grid-cols-1 gap-3 transition-opacity md:grid-cols-2 xl:grid-cols-3"
        :class="{ 'opacity-60': lista.cargando.value }"
        :aria-busy="lista.cargando.value"
      >
        <li v-for="nota in lista.notas.value" :key="nota.id">
          <TarjetaDeNotaDeCredito :nota="nota" />
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
