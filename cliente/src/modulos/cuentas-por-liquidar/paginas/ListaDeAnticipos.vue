<script setup lang="ts">
import { HandCoins, Inbox, Plus } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import FiltrosDeAnticipos from '../componentes/FiltrosDeAnticipos.vue';
import PaginacionDeLista from '../componentes/PaginacionDeLista.vue';
import VentanaDeAnticipo from '../componentes/VentanaDeAnticipo.vue';
import VentanaDeBeneficiarioNuevo from '../componentes/VentanaDeBeneficiarioNuevo.vue';
import {
  detallesDeLaFilaDeAnticipo,
  marcaDelAnticipo,
  resumenDeVencidos,
} from '../composables/anticipos/lista-de-anticipos';
import { usarAnticipos } from '../composables/anticipos/usar-anticipos';
import { usarVentanaDeAnticipo } from '../composables/anticipos/usar-ventana-de-anticipo';
import { VENTANAS_CUENTAS_POR_LIQUIDAR } from '../textos';

/** Los anticipos: lo que cada beneficiario debe justificar (con fecha de corte y vencidos) y, desde aquí, entregar uno. */
const ventana = VENTANAS_CUENTAS_POR_LIQUIDAR.anticipos;
const router = useRouter();
const lista = usarAnticipos();
const entrega = usarVentanaDeAnticipo(lista.recargar);
const irALaBandeja = () => router.push({ name: 'cuentas-por-liquidar.bandeja' });
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <span v-permiso="'cuentas-por-liquidar.anticipos.ver'" class="contents">
        <BotonBase variante="secundario" :icono="Inbox" @click="irALaBandeja">Bandeja de documentos</BotonBase>
      </span>
      <span v-permiso="'cuentas-por-liquidar.anticipos.crear'" class="contents">
        <BotonBase :icono="Plus" @click="entrega.abrir">{{ ventana.nuevo }}</BotonBase>
      </span>
    </EncabezadoPagina>

    <FiltrosDeAnticipos
      v-model="lista.filtros"
      :hoy="lista.hoy.value"
      :beneficiarios="lista.beneficiarios.value"
      @quitar="lista.quitarFiltros"
    />

    <p class="mb-3 text-sm" aria-live="polite">
      <strong>{{ formatearMonto(lista.totalPorJustificar.value) }}</strong>
      por justificar en {{ lista.total.value }} {{ lista.total.value === 1 ? 'anticipo' : 'anticipos' }}
      <template v-if="lista.filtros.corte">al {{ formatearFecha(lista.filtros.corte) }}</template>
    </p>
    <p
      v-if="resumenDeVencidos(lista.anticipos.value)"
      class="mb-3 rounded-xl bg-trigo-300/30 p-3 text-sm ring-1 ring-trigo-500/40 dark:bg-trigo-500/10"
      role="status"
    >
      {{ resumenDeVencidos(lista.anticipos.value) }}
    </p>

    <p v-if="lista.cargando.value && lista.anticipos.value.length === 0" class="text-sm text-tierra-500" role="status">
      Cargando…
    </p>
    <EstadoVacio
      v-else-if="lista.anticipos.value.length === 0"
      :icono="HandCoins"
      titulo="No hay anticipos con estos filtros"
      descripcion="Un anticipo es dinero que la empresa entrega a una persona para que lo gaste y lo justifique con documentos. Quite los filtros o entregue uno."
    >
      <div class="flex flex-wrap justify-center gap-2">
        <BotonBase variante="secundario" @click="lista.quitarFiltros">Quitar filtros</BotonBase>
        <span v-permiso="'cuentas-por-liquidar.anticipos.crear'" class="contents">
          <BotonBase :icono="Plus" @click="entrega.abrir">{{ ventana.nuevo }}</BotonBase>
        </span>
      </div>
    </EstadoVacio>
    <template v-else>
      <ul
        class="grid grid-cols-1 gap-3 transition-opacity md:grid-cols-2 xl:grid-cols-3"
        :class="{ 'opacity-60': lista.cargando.value }"
        :aria-busy="lista.cargando.value"
      >
        <li v-for="fila in lista.anticipos.value" :key="fila.id">
          <TarjetaDeRegistro
            :titulo="`Anticipo ${fila.numero}`"
            :detalles="detallesDeLaFilaDeAnticipo(fila, lista.filtros.corte)"
            permiso="cuentas-por-liquidar.anticipos.ver"
            :insignia="marcaDelAnticipo(fila)"
            :class="{ 'opacity-80': fila.estado === 'anulado' }"
            :destino="{ name: 'cuentas-por-liquidar.anticipos.ficha', params: { id: fila.id } }"
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

    <VentanaDeAnticipo
      v-model="entrega.edicion.value"
      v-bind="entrega.propiedades.value"
      @cerrar="entrega.cerrar"
      @guardar="entrega.guardar"
      @nuevo-beneficiario="entrega.nuevo.abrir"
    />
    <VentanaDeBeneficiarioNuevo
      v-model="entrega.nuevo.edicion.value"
      :errores="entrega.nuevo.errores.value"
      :enviando="entrega.nuevo.enviando.value"
      @cerrar="entrega.nuevo.cerrar"
      @guardar="entrega.nuevo.guardar"
    />
  </div>
</template>
