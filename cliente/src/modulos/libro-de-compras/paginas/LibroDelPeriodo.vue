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
import EmisionesDelPeriodo from '../componentes/libro/EmisionesDelPeriodo.vue';
import VentanaDeEmision from '../componentes/libro/VentanaDeEmision.vue';
import VentanaDeFolio from '../componentes/libro/VentanaDeFolio.vue';
import { exigeMotivo } from '../composables/libro/datos-de-emisiones';
import { etiquetaDePeriodo } from '../composables/documentos/filtros-de-documentos';
import { usarSalidasDelLibro } from '../composables/libro/usar-salidas-del-libro';
import { usarLibro } from '../composables/libro/usar-libro';
import { VENTANA_DEL_LIBRO as ventana } from '../textos-del-libro';

const { periodo, verAnulados, libro, cargandoLibro, anulados, cargandoAnulados, opcionesDePeriodo } = usarLibro();
const salidas = usarSalidasDelLibro(periodo);
const { emision, correccion } = salidas;
</script>

<template>
  <div class="min-w-0">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <SalidasDelLibro
        :ocupado="salidas.descargando.value"
        @exportar="salidas.exportar"
        @borrador="salidas.verBorrador"
        @emitir="emision.abrir"
        @corregir-folio="correccion.abrir(salidas.ultimoFolio.value)"
      />
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

    <EmisionesDelPeriodo
      :emisiones="salidas.emisiones.value"
      :ultimo-folio="salidas.ultimoFolio.value"
      @copia="salidas.descargarCopia"
    />
    <VentanaDeEmision
      v-model:motivo="emision.motivo.value"
      :abierta="emision.abierta.value"
      :periodo="etiquetaDePeriodo(periodo)"
      :ultimo-folio="salidas.ultimoFolio.value"
      :pide-motivo="exigeMotivo(salidas.emisiones.value)"
      :enviando="emision.enviando.value"
      :errores="emision.errores.value"
      @emitir="emision.emitir"
      @cerrar="emision.abierta.value = false"
    />
    <VentanaDeFolio
      v-model:folio="correccion.folio.value"
      v-model:motivo="correccion.motivo.value"
      :abierta="correccion.abierta.value"
      :enviando="correccion.enviando.value"
      :errores="correccion.errores.value"
      @guardar="correccion.guardar"
      @cerrar="correccion.abierta.value = false"
    />
  </div>
</template>
