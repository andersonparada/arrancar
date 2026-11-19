<script setup lang="ts">
import { Coins, RefreshCw } from 'lucide-vue-next';
import BotonBase from '../componentes/BotonBase.vue';
import EncabezadoPagina from '../componentes/EncabezadoPagina.vue';
import EstadoVacio from '../componentes/EstadoVacio.vue';
import FiltrosDeMonedas from '../componentes/plataforma/FiltrosDeMonedas.vue';
import TarjetaDeMoneda from '../componentes/plataforma/TarjetaDeMoneda.vue';
import VentanaDeMoneda from '../componentes/plataforma/VentanaDeMoneda.vue';
import { serieDe } from '../composables/plataforma/lista-de-monedas';
import { usarMonedasDePlataforma } from '../composables/plataforma/usar-monedas-de-plataforma';
import { VENTANAS_CORE } from '../textos';
import { formatearFechaHora } from '../utilidades/formato';

const pantalla = usarMonedasDePlataforma();
const { filtros, visibles, series, muestra, cargando, actualizando, ultimaActualizacion } = pantalla;
const quitarFiltros = () => Object.assign(filtros, { conCodigo: false, activas: false });
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="VENTANAS_CORE.monedas.titulo" :descripcion="VENTANAS_CORE.monedas.descripcion">
      <div v-permiso="'configuracion.monedas.editar'" class="flex flex-col gap-1 sm:items-end">
        <BotonBase variante="secundario" :icono="RefreshCw" :cargando="actualizando" @click="pantalla.actualizarLista">
          Actualizar lista del Banguat
        </BotonBase>
        <p class="text-xs text-tierra-600 dark:text-tierra-300">
          {{
            ultimaActualizacion
              ? `Última actualización: ${formatearFechaHora(ultimaActualizacion)}`
              : 'La lista del Banguat no se ha actualizado.'
          }}
        </p>
      </div>
    </EncabezadoPagina>

    <FiltrosDeMonedas v-model="filtros" :mostradas="visibles.length" :total="pantalla.total.value" />

    <EstadoVacio
      v-if="!cargando && !visibles.length"
      :icono="Coins"
      titulo="Ninguna moneda cumple los filtros"
      descripcion="Quite un filtro para ver más monedas."
    >
      <BotonBase variante="secundario" @click="quitarFiltros">Quitar filtros</BotonBase>
    </EstadoVacio>
    <ul v-else class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      <li v-for="moneda in visibles" :key="moneda.codigo">
        <TarjetaDeMoneda
          :moneda="moneda"
          :serie="serieDe(moneda, series)"
          :lista="pantalla.lista.value"
          @editar="pantalla.abrir(moneda)"
        />
      </li>
    </ul>

    <VentanaDeMoneda
      v-model="pantalla.edicion.value"
      :lista="pantalla.lista.value"
      :errores="pantalla.errores.value"
      :enviando="pantalla.enviando.value"
      :muestra="muestra.muestra"
      :resultado-de-la-muestra="muestra.resultado"
      :cargando-muestra="muestra.cargando"
      @cerrar="pantalla.cerrar"
      @guardar="pantalla.guardar"
      @ver-muestra="muestra.ver"
    />
  </div>
</template>
