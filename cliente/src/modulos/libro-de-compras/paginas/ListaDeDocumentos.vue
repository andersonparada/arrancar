<script setup lang="ts">
import { FileDown, Plus, ReceiptText } from 'lucide-vue-next';
import { RouterLink, useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import FiltrosDeDocumentos from '../componentes/documentos/FiltrosDeDocumentos.vue';
import PaginacionDeLista from '../componentes/documentos/PaginacionDeLista.vue';
import TarjetaDeDocumento from '../componentes/documentos/TarjetaDeDocumento.vue';
import { usarPendientesDeLaSat } from '../composables/bandeja/usar-pendientes-de-la-sat';
import { usarListaDeDocumentos } from '../composables/documentos/usar-lista-de-documentos';
import { VENTANA_DE_DOCUMENTOS as ventana } from '../textos-de-documentos';
import { IMPORTAR_DE_LA_SAT } from '../textos-de-la-bandeja';

const router = useRouter();
const { documentos, total, pagina, paginas, cargando, filtros, proveedores, quitarFiltros, limite } =
  usarListaDeDocumentos();
const pendientesDeLaSat = usarPendientesDeLaSat();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <BotonBase
        v-permiso="'libro-de-compras.documentos.importar'"
        variante="secundario"
        :icono="FileDown"
        @click="router.push({ name: 'libro-de-compras.dte-recibidos' })"
      >
        {{ IMPORTAR_DE_LA_SAT.boton }}
      </BotonBase>
      <BotonBase
        v-permiso="'libro-de-compras.documentos.crear'"
        :icono="Plus"
        @click="router.push({ name: 'libro-de-compras.documentos.nuevo' })"
      >
        {{ ventana.registrar }}
      </BotonBase>
    </EncabezadoPagina>

    <RouterLink
      v-if="pendientesDeLaSat > 0"
      :to="{ name: 'libro-de-compras.dte-recibidos' }"
      class="mb-4 block rounded-2xl bg-trigo-300/40 p-4 text-sm font-medium text-tierra-900 hover:bg-trigo-300/60 dark:bg-trigo-500/20 dark:text-trigo-300"
    >
      {{ pendientesDeLaSat === 1 ? '1 DTE pendiente de la SAT' : `${pendientesDeLaSat} DTE pendientes de la SAT` }}:
      revíselos y regístrelos de una vez.
    </RouterLink>

    <FiltrosDeDocumentos v-model="filtros" :proveedores="proveedores" @quitar="quitarFiltros" />

    <p v-if="cargando && documentos.length === 0" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <EstadoVacio
      v-else-if="documentos.length === 0"
      :icono="ReceiptText"
      titulo="No hay facturas con estos filtros"
      descripcion="Pruebe con otro período o quite los filtros. Los registros anulados se ven escogiendo «Anulados» o «Todos» en Estado."
    >
      <BotonBase variante="secundario" @click="quitarFiltros">Quitar filtros</BotonBase>
    </EstadoVacio>
    <ul
      v-else
      class="grid gap-3 transition-opacity md:grid-cols-2 xl:grid-cols-3"
      :class="{ 'opacity-60': cargando }"
      :aria-busy="cargando"
    >
      <li v-for="documento in documentos" :key="documento.id">
        <TarjetaDeDocumento :documento="documento" />
      </li>
    </ul>

    <PaginacionDeLista v-model="pagina" :paginas="paginas" :limite="limite" :total="total" />
  </div>
</template>
