<script setup lang="ts">
import { Inbox, Plus, SearchX } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import FiltrosDeParcelas from '../componentes/parcelas/FiltrosDeParcelas.vue';
import GrupoDeParcelas from '../componentes/parcelas/GrupoDeParcelas.vue';
import { usarArbolDeParcelas } from '../composables/parcelas/usar-arbol-de-parcelas';
import { VENTANAS_PARCELAS } from '../textos';

const ventana = VENTANAS_PARCELAS.parcelas;
const PERMISOS_DE_INTERCAMBIO = { importar: 'parcelas.parcelas.importar', exportar: 'parcelas.parcelas.exportar' };
const router = useRouter();
const lista = usarArbolDeParcelas();
const { filtros, grupos, cargando, intercambio } = lista;
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
        v-permiso="'parcelas.parcelas.crear'"
        :icono="Plus"
        @click="router.push({ name: 'parcelas.parcelas.nueva' })"
      >
        {{ ventana.nuevo }}
      </BotonBase>
    </EncabezadoPagina>

    <FiltrosDeParcelas
      v-model="filtros"
      :localidades="lista.localidadesConocidas.value"
      :hay-filtros="lista.hayFiltros.value"
      :hay-con-hijas="lista.hayConHijas.value"
      @limpiar="lista.limpiarFiltros"
      @contraer="lista.contraerTodo"
      @expandir="lista.expandirTodo"
    />

    <p v-if="lista.sinSumas.value && !cargando" class="mb-3 text-sm text-tierra-500">
      Con una búsqueda escrita no se calculan las sumas de superficie: quite el texto para verlas completas.
    </p>
    <p v-if="cargando" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <EstadoVacio
      v-else-if="!grupos.length && lista.hayFiltros.value"
      :icono="SearchX"
      titulo="Ninguna parcela coincide"
      descripcion="Pruebe con otra localidad, con menos letras, o muestre también las inactivas."
    >
      <BotonBase variante="secundario" @click="lista.limpiarFiltros">Quitar filtros</BotonBase>
    </EstadoVacio>
    <EstadoVacio
      v-else-if="!grupos.length"
      :icono="Inbox"
      titulo="Todavía no hay parcelas"
      descripcion="Registre cada potrero, lote o tablón bajo su finca. Puede importarlas de un Excel si ya las tiene en una hoja."
    >
      <BotonBase
        v-permiso="'parcelas.parcelas.crear'"
        :icono="Plus"
        @click="router.push({ name: 'parcelas.parcelas.nueva' })"
      >
        {{ ventana.nuevo }}
      </BotonBase>
    </EstadoVacio>
    <div v-else class="space-y-8">
      <GrupoDeParcelas
        v-for="grupo in grupos"
        :key="grupo.localidadId"
        :grupo="grupo"
        :mostrar="lista.mostrar"
        @alternar="lista.alternar"
      />
    </div>

    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar parcelas"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
