<script setup lang="ts">
import { ArrowDownToLine, ArrowUpFromLine, Inbox } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import FiltrosDeDocumentos from '../componentes/documentos/FiltrosDeDocumentos.vue';
import { detallesDeLaTarjeta, tituloDeDocumento } from '../composables/documentos/detalles-de-documento';
import { usarListaDeDocumentos } from '../composables/documentos/usar-lista-de-documentos';
import { VENTANAS_INVENTARIOS } from '../textos';

const ventana = VENTANAS_INVENTARIOS.movimientos;
const router = useRouter();
const { filtros, documentos, cargando, referencias, hayFiltros, limpiar } = usarListaDeDocumentos();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <BotonBase
        v-permiso="'inventarios.entradas.crear'"
        variante="secundario"
        :icono="ArrowDownToLine"
        @click="router.push({ name: 'inventarios.movimientos.entrada' })"
      >
        Entrada
      </BotonBase>
      <BotonBase
        v-permiso="'inventarios.salidas.crear'"
        :icono="ArrowUpFromLine"
        @click="router.push({ name: 'inventarios.movimientos.salida' })"
      >
        Salida
      </BotonBase>
    </EncabezadoPagina>

    <FiltrosDeDocumentos
      v-model="filtros"
      :opciones-de-bodegas="referencias.opcionesDeBodegas.value"
      :con-bodegas="referencias.hayBodegas"
    />

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio
      v-else-if="!documentos.length"
      :icono="Inbox"
      :titulo="hayFiltros ? 'Ningún movimiento coincide con los filtros' : 'Todavía no hay movimientos'"
      :descripcion="
        hayFiltros
          ? 'Pruebe con otras fechas, clase o bodega.'
          : 'Registre una entrada o una salida, o reciba compras desde «Por recibir».'
      "
    >
      <BotonBase v-if="hayFiltros" variante="secundario" @click="limpiar">Quitar filtros</BotonBase>
    </EstadoVacio>
    <ul v-else class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <li v-for="documento in documentos" :key="documento.id">
        <TarjetaDeRegistro
          :titulo="tituloDeDocumento(documento)"
          :detalles="detallesDeLaTarjeta(documento)"
          permiso="inventarios.existencias.ver"
          solo-lectura
          :insignia="documento.estado === 'anulado' ? 'Anulado' : undefined"
          :destino="{ name: 'inventarios.movimientos.ficha', params: { documentoId: documento.id } }"
        />
      </li>
    </ul>
  </div>
</template>
