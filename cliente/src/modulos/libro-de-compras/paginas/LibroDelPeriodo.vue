<script setup lang="ts">
import { BookOpen } from 'lucide-vue-next';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AvisosDelLibro from '../componentes/libro/AvisosDelLibro.vue';
import EncabezadoDelLibro from '../componentes/libro/EncabezadoDelLibro.vue';
import LeyendaDelLibro from '../componentes/libro/LeyendaDelLibro.vue';
import PestanasDelLibro from '../componentes/libro/PestanasDelLibro.vue';
import ResumenDelPeriodo from '../componentes/libro/ResumenDelPeriodo.vue';
import SalidasDelLibro from '../componentes/libro/SalidasDelLibro.vue';
import TablaDeAnulados from '../componentes/libro/TablaDeAnulados.vue';
import TablaDelLibro from '../componentes/libro/TablaDelLibro.vue';
import { usarLibro } from '../composables/libro/usar-libro';
import { VENTANA_DEL_LIBRO as ventana } from '../textos-del-libro';

const { periodo, verAnulados, libro, cargandoLibro, anulados, cargandoAnulados, opcionesDePeriodo } = usarLibro();
</script>

<template>
  <div class="min-w-0">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <SalidasDelLibro />
    </EncabezadoPagina>

    <div class="mb-4 max-w-xs">
      <CampoSelector v-model="periodo" etiqueta="Período" :opciones="opcionesDePeriodo" />
    </div>
    <PestanasDelLibro v-model="verAnulados" />

    <div :class="{ 'opacity-60': cargandoLibro || cargandoAnulados }" :aria-busy="cargandoLibro || cargandoAnulados">
      <template v-if="!verAnulados">
        <p v-if="cargandoLibro && !libro" class="text-sm text-tierra-500" role="status">Cargando…</p>
        <template v-else-if="libro">
          <EncabezadoDelLibro :libro="libro" />
          <AvisosDelLibro :avisos="libro.avisos" />
          <EstadoVacio
            v-if="libro.filas.length === 0"
            :icono="BookOpen"
            titulo="No hay compras en este período"
            descripcion="Registre las facturas del mes en Documentos de compra, o escoja otro período."
          />
          <template v-else>
            <TablaDelLibro :libro="libro" />
            <LeyendaDelLibro v-if="libro.tipoDeLibro === 'completo'" :leyenda="libro.leyenda" />
            <ResumenDelPeriodo :libro="libro" />
          </template>
        </template>
      </template>
      <template v-else>
        <p v-if="cargandoAnulados && !anulados" class="text-sm text-tierra-500" role="status">Cargando…</p>
        <TablaDeAnulados v-else-if="anulados" :anulados="anulados" />
      </template>
    </div>
  </div>
</template>
