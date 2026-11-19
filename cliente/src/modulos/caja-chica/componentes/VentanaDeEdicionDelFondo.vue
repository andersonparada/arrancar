<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeDatosDelFondo } from '../composables/fondos/edicion-de-datos-del-fondo';
import { opcionesDeCuentas, opcionesDeLocalidades } from '../composables/fondos/opciones-de-fondos';
import type { CuentaParaElFondo, LocalidadParaElFondo } from '../servicios/catalogos.api';
import { AYUDA_DEL_TOPE, MAXIMO_DEL_MOTIVO } from '../textos';

/** Corregir los datos de un fondo abierto. El monto y el custodio se cambian con sus propias acciones. */
const props = defineProps<{
  abierta: boolean;
  enviando: boolean;
  errores: Record<string, string>;
  localidades: readonly LocalidadParaElFondo[];
  cuentas: readonly CuentaParaElFondo[];
  /** Si el tope escrito es otro que el del fondo: entonces se pide el motivo. */
  cambiaElTope: boolean;
}>();
const edicion = defineModel<EdicionDeDatosDelFondo>({ required: true });
const emit = defineEmits<{ cerrar: []; guardar: [] }>();

const opcionesDeLocalidad = computed(() => opcionesDeLocalidades(props.localidades, 'Sin localidad'));
const opcionesDeCuenta = computed(() => opcionesDeCuentas(props.cuentas, 'Sin cuenta fija'));
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Editar el fondo" @cerrar="emit('cerrar')">
    <form id="form-de-edicion-del-fondo" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <CampoTexto v-model="edicion.nombre" etiqueta="Nombre" requerido :longitud-maxima="80" :error="errores.nombre" />
      <CampoSelector
        v-if="localidades.length > 0"
        v-model="edicion.localidadId"
        etiqueta="Localidad"
        :opciones="opcionesDeLocalidad"
        :error="errores.localidadId"
      />
      <CampoTexto
        v-model="edicion.tope"
        etiqueta="Tope por comprobante"
        tipo="number"
        paso="any"
        :ayuda="AYUDA_DEL_TOPE"
        :error="errores.topePorComprobante"
      />
      <CampoTexto
        v-if="cambiaElTope"
        v-model="edicion.motivo"
        etiqueta="Por qué cambia el tope"
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        ayuda="Opcional; queda en la auditoría."
        :error="errores.motivo"
      />
      <CampoSelector
        v-if="cuentas.length > 0"
        v-model="edicion.cuentaBancariaId"
        etiqueta="Cuenta que se propone al reponer"
        :opciones="opcionesDeCuenta"
        :error="errores.cuentaBancariaId"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-edicion-del-fondo" :cargando="enviando">Guardar cambios</BotonBase>
    </template>
  </VentanaModal>
</template>
