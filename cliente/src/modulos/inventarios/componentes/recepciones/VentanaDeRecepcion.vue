<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { EdicionDeRecepcion } from '../../composables/recepciones/edicion-de-recepcion';
import type { CatalogoDeRenglones } from '../../composables/documentos/usar-catalogo-de-renglones';
import AvisoDeReferencias from '../compartido/AvisoDeReferencias.vue';
import FilaDeRenglonRecibido from './FilaDeRenglonRecibido.vue';

/** Recibir las líneas elegidas en una bodega: lo que no se reciba completo queda en la bandeja. */
defineProps<{
  catalogo: CatalogoDeRenglones;
  avisoDeReferencias: string | null;
  opcionesDeBodegas: OpcionDeRegistro[];
  errores: Record<string, string>;
  enviando: boolean;
}>();
const edicion = defineModel<EdicionDeRecepcion>({ required: true });
const emit = defineEmits<{
  cerrar: [];
  guardar: [];
  elegirArticulo: [articuloId: string | null];
  dividir: [indice: number];
  quitar: [indice: number];
}>();
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Recibir mercadería" ancha @cerrar="emit('cerrar')">
    <form id="form-de-recepcion" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <AvisoDeReferencias :texto="avisoDeReferencias" />
      <div class="grid gap-4 sm:grid-cols-2">
        <CampoTexto
          v-model="edicion.fecha"
          etiqueta="Fecha en que llegó"
          tipo="date"
          requerido
          :error="errores.fecha"
        />
        <CampoSelector
          v-model="edicion.bodegaId"
          etiqueta="Bodega que recibe"
          :opciones="opcionesDeBodegas"
          requerido
          :error="errores.bodegaId"
        />
      </div>
      <p v-if="errores.renglones" role="alert" class="text-sm text-red-700 dark:text-red-300">
        {{ errores.renglones }}
      </p>
      <ul class="space-y-3">
        <li v-for="(renglon, indice) in edicion.renglones" :key="renglon.clave">
          <FilaDeRenglonRecibido
            :model-value="renglon"
            :indice="indice"
            :errores="errores"
            :opciones-de-articulos="catalogo.opcionesDeArticulos.value"
            :opciones-de-unidades="catalogo.opcionesDeUnidadesDe(renglon.articuloId)"
            :opciones-de-lotes="catalogo.opcionesDeLotesDe(renglon.articuloId)"
            :maneja-lotes="catalogo.articuloDe(renglon.articuloId)?.manejaLotes ?? false"
            :vencimiento-obligatorio="catalogo.articuloDe(renglon.articuloId)?.manejaVencimiento ?? false"
            @elegir-articulo="emit('elegirArticulo', renglon.articuloId)"
            @dividir="emit('dividir', indice)"
            @quitar="emit('quitar', indice)"
          />
        </li>
      </ul>
      <CampoTexto v-model="edicion.observaciones" etiqueta="Observaciones" multilinea :error="errores.observaciones" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-recepcion" :cargando="enviando">Recibir</BotonBase>
    </template>
  </VentanaModal>
</template>
