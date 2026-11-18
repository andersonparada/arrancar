<script setup lang="ts">
import { Banknote, Plus, Wallet } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import FiltrosDeRetiros from '../componentes/FiltrosDeRetiros.vue';
import PaginacionDeLista from '../componentes/PaginacionDeLista.vue';
import VentanaDeRetiro from '../componentes/VentanaDeRetiro.vue';
import {
  avisosDeMesAnterior,
  detallesDeLaFilaDeRetiro,
  marcaDeLaFilaDeRetiro,
} from '../composables/retiros/lista-de-retiros';
import { usarRetiros } from '../composables/retiros/usar-retiros';
import { usarVentanaDeRetiro } from '../composables/retiros/usar-ventana-de-retiro';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

/** Los retiros de efectivo: cuánto queda en manos de cada custodio (con fecha de corte), y desde aquí se retira y se reparte. */
const ventana = VENTANAS_CUENTAS_POR_PAGAR.retiros;
const router = useRouter();
const lista = usarRetiros();
const retiro = usarVentanaDeRetiro(lista.recargar);
const pagar = () => router.push({ name: 'cuentas-por-pagar.pagos.efectivo' });
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <span v-permiso="'cuentas-por-pagar.pagos.pagar-en-efectivo'" class="contents">
        <BotonBase variante="secundario" :icono="Banknote" @click="pagar">{{ ventana.pagar }}</BotonBase>
      </span>
      <span v-permiso="'cuentas-por-pagar.retiros.crear'" class="contents">
        <BotonBase :icono="Plus" @click="retiro.abrir">{{ ventana.nuevo }}</BotonBase>
      </span>
    </EncabezadoPagina>

    <FiltrosDeRetiros v-model="lista.filtros" :hoy="lista.hoy.value" @quitar="lista.quitarFiltros" />

    <p class="mb-3 text-sm" aria-live="polite">
      <strong>{{ formatearMonto(lista.totalDisponible.value) }}</strong>
      en efectivo disponible en {{ lista.total.value }} {{ lista.total.value === 1 ? 'retiro' : 'retiros' }}
      <template v-if="lista.filtros.corte">al {{ formatearFecha(lista.filtros.corte) }}</template>
    </p>
    <section
      v-for="aviso in avisosDeMesAnterior(lista.retiros.value)"
      :key="aviso"
      class="mb-3 rounded-xl bg-trigo-300/30 p-3 text-sm ring-1 ring-trigo-500/40 dark:bg-trigo-500/10"
      role="status"
    >
      {{ aviso }}
    </section>

    <p v-if="lista.cargando.value && lista.retiros.value.length === 0" class="text-sm text-tierra-500" role="status">
      Cargando…
    </p>
    <EstadoVacio
      v-else-if="lista.retiros.value.length === 0"
      :icono="Wallet"
      titulo="No hay retiros con estos filtros"
      descripcion="Un retiro es el efectivo que se saca del banco para pagar a proveedores. Quite los filtros o retire efectivo."
    >
      <div class="flex flex-wrap justify-center gap-2">
        <BotonBase variante="secundario" @click="lista.quitarFiltros">Quitar filtros</BotonBase>
        <span v-permiso="'cuentas-por-pagar.retiros.crear'" class="contents">
          <BotonBase :icono="Plus" @click="retiro.abrir">{{ ventana.nuevo }}</BotonBase>
        </span>
      </div>
    </EstadoVacio>
    <template v-else>
      <ul
        class="grid grid-cols-1 gap-3 transition-opacity md:grid-cols-2 xl:grid-cols-3"
        :class="{ 'opacity-60': lista.cargando.value }"
        :aria-busy="lista.cargando.value"
      >
        <li v-for="fila in lista.retiros.value" :key="fila.id">
          <TarjetaDeRegistro
            :titulo="`Retiro ${fila.numero}`"
            :detalles="detallesDeLaFilaDeRetiro(fila, lista.hoy.value, lista.filtros.corte)"
            permiso="cuentas-por-pagar.retiros.ver"
            :insignia="marcaDeLaFilaDeRetiro(fila)"
            :class="{ 'opacity-80': fila.estado === 'anulado' }"
            :destino="{ name: 'cuentas-por-pagar.retiros.ficha', params: { id: fila.id } }"
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

    <VentanaDeRetiro
      v-model="retiro.edicion.value"
      :resultado="retiro.resultado.value"
      :medios="retiro.medios.value"
      :custodios="retiro.custodios.value"
      :puede-elegir-usuario="retiro.puedeElegirUsuario.value"
      :cargando="retiro.cargando.value"
      :errores="retiro.errores.value"
      :enviando="retiro.enviando.value"
      @cerrar="retiro.cerrar"
      @guardar="retiro.guardar"
    />
  </div>
</template>
