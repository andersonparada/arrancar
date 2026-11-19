<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import type { EdicionDeVale } from '../composables/comprobantes/edicion-de-vale';
import { opcionesDeNombres } from '../composables/fondos/opciones-de-fondos';
import type { ConceptoParaElVale } from '../servicios/catalogos.api';
import { AYUDA_DE_LA_FECHA, AYUDA_DEL_VALE, MAXIMO_DEL_MOTIVO } from '../textos';

/** Un vale de gasto: gasto menor sin factura, con quien recibió el dinero y por qué no hay factura. */
const props = defineProps<{
  abierta: boolean;
  enviando: boolean;
  errores: Record<string, string>;
  conceptos: readonly ConceptoParaElVale[];
  /** Al liquidar un vale provisional el gasto no se registra todavía: solo se agrega a la lista. */
  textoDelBoton?: string;
}>();
const edicion = defineModel<EdicionDeVale>({ required: true });
const emit = defineEmits<{ cerrar: []; guardar: [] }>();

const opciones = computed(() => opcionesDeNombres(props.conceptos, 'Elija el concepto de gasto'));
const puedeSobreElTope = usarSesion().puede('caja-chica.comprobantes.sobre-el-tope');
</script>

<template>
  <VentanaModal
    :abierta="abierta"
    :titulo="textoDelBoton ? 'Gasto sin factura' : 'Vale de gasto'"
    @cerrar="emit('cerrar')"
  >
    <form id="form-de-vale" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ AYUDA_DEL_VALE }}</p>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto
          v-model="edicion.monto"
          etiqueta="Monto"
          tipo="number"
          paso="any"
          requerido
          :error="errores.monto"
        />
        <CampoTexto
          v-model="edicion.fecha"
          etiqueta="Fecha"
          tipo="date"
          :ayuda="AYUDA_DE_LA_FECHA"
          :error="errores.fecha"
        />
      </div>
      <CampoTexto
        v-model="edicion.descripcion"
        etiqueta="Qué se compró o pagó"
        requerido
        :longitud-maxima="300"
        :error="errores.descripcion"
      />
      <CampoTexto
        v-model="edicion.pagadoA"
        etiqueta="Pagado a"
        requerido
        :longitud-maxima="150"
        :error="errores.pagadoA"
      />
      <CampoSelector
        v-model="edicion.conceptoDeGastoId"
        etiqueta="Concepto de gasto"
        requerido
        :opciones="opciones"
        :error="errores.conceptoDeGastoId"
      />
      <p v-if="conceptos.length === 0" class="text-sm text-tierra-600 dark:text-tierra-300" role="status">
        No hay conceptos de gasto activos. Pida que creen uno en Libro de compras para registrar el vale.
      </p>
      <CampoTexto
        v-model="edicion.motivoSinDocumento"
        etiqueta="Por qué no hay factura"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        :error="errores.motivoSinDocumento"
      />
      <CampoTexto
        v-if="puedeSobreElTope"
        v-model="edicion.motivoSobreElTope"
        etiqueta="Motivo si el vale pasa del tope"
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        ayuda="Solo hace falta si el monto pasa del tope de los vales; si no, se ignora."
        :error="errores.motivoSobreElTope"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-vale" :cargando="enviando">{{
        textoDelBoton ?? 'Registrar vale'
      }}</BotonBase>
    </template>
  </VentanaModal>
</template>
