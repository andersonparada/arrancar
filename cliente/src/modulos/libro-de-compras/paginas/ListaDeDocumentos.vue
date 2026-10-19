<script setup lang="ts">
import { Plus, ReceiptText } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import FiltrosDeDocumentos from '../componentes/documentos/FiltrosDeDocumentos.vue';
import PaginacionDeLista from '../componentes/documentos/PaginacionDeLista.vue';
import TarjetaDeDocumento from '../componentes/documentos/TarjetaDeDocumento.vue';
import { usarListaDeDocumentos } from '../composables/documentos/usar-lista-de-documentos';
import { VENTANA_DE_DOCUMENTOS as ventana } from '../textos-de-documentos';

const router = useRouter();
const { documentos, total, pagina, paginas, cargando, filtros, proveedores, quitarFiltros, limite } =
  usarListaDeDocumentos();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <BotonBase
        v-permiso="'libro-de-compras.documentos.crear'"
        :icono="Plus"
        @click="router.push({ name: 'libro-de-compras.documentos.nuevo' })"
      >
        {{ ventana.registrar }}
      </BotonBase>
    </EncabezadoPagina>

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
