<script setup lang="ts">
import { BadgeCheck, FileClock } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AvisoDeLoPropio from '../componentes/AvisoDeLoPropio.vue';
import BarraDeSeleccion from '../componentes/BarraDeSeleccion.vue';
import FiltrosDeDocumentosPorPagar from '../componentes/FiltrosDeDocumentosPorPagar.vue';
import PaginacionDeLista from '../componentes/PaginacionDeLista.vue';
import TarjetaDeDocumentoPorPagar from '../componentes/TarjetaDeDocumentoPorPagar.vue';
import { esperaAOtraPersona, sePuedeMarcarParaAutorizar } from '../composables/reglas-de-acciones';
import { usarDocumentosPorPagar } from '../composables/usar-documentos-por-pagar';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_PAGAR.documentos;
const lista = usarDocumentosPorPagar();
const aviso = lista.autorizacion.avisoDeLoPropio;
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" />

    <FiltrosDeDocumentosPorPagar
      v-model="lista.filtros"
      :proveedores="lista.proveedores.value"
      @quitar="lista.quitarFiltros"
    />
    <AvisoDeLoPropio :mensaje="aviso" @cerrar="lista.autorizacion.cerrarAviso" />

    <p v-if="lista.cargando.value && lista.documentos.value.length === 0" class="text-sm text-tierra-500" role="status">
      Cargando…
    </p>
    <EstadoVacio
      v-else-if="lista.documentos.value.length === 0"
      :icono="FileClock"
      titulo="No hay documentos con estos filtros"
      descripcion="Pruebe con otras fechas o quite los filtros. Lo anulado se ve escogiendo «Anulados» o «Todos» en Estado."
    >
      <BotonBase variante="secundario" @click="lista.quitarFiltros">Quitar filtros</BotonBase>
    </EstadoVacio>
    <template v-else>
      <ul
        class="grid grid-cols-1 gap-3 transition-opacity md:grid-cols-2 xl:grid-cols-3"
        :class="{ 'opacity-60': lista.cargando.value }"
        :aria-busy="lista.cargando.value"
      >
        <li v-for="documento in lista.documentos.value" :key="documento.id">
          <TarjetaDeDocumentoPorPagar
            :documento="documento"
            :puede-marcar="lista.puedeAutorizar && sePuedeMarcarParaAutorizar(documento, lista.puedeAutorizarPropios)"
            :marcado="lista.seleccion.value.includes(documento.id)"
            :espera-a-otra-persona="lista.puedeAutorizar && esperaAOtraPersona(documento, lista.puedeAutorizarPropios)"
            @alternar="lista.alternar(documento.id)"
          />
        </li>
      </ul>
      <PaginacionDeLista
        v-model="lista.pagina.value"
        :paginas="lista.paginas.value"
        :limite="lista.limite"
        :total="lista.total.value"
      />
      <BarraDeSeleccion
        v-if="lista.puedeAutorizar && lista.seleccion.value.length > 0"
        :cantidad="lista.seleccion.value.length"
        accion="Autorizar"
        :icono="BadgeCheck"
        invitacion=""
        :aviso="lista.avisoDeLote.value"
        :enviando="lista.autorizacion.enviando.value"
        @accion="lista.autorizarEscogidos"
        @limpiar="lista.limpiar"
      />
    </template>
  </div>
</template>
