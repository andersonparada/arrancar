<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import {
  resumenDelCambio,
  sePuedeConfirmar,
  textoDeConfirmar,
  type EdicionDeCambioDeFormulario,
} from '../../composables/cheques/edicion-de-cambio-de-formulario';

/**
 * El papel de un cheque impreso. Si sigue en la empresa se pasa el pago a otro formulario (dos confirmaciones
 * obligatorias); si se perdió o salió de la empresa no es inutilizado sino extraviado: se anula y hay que avisar al banco.
 */
defineProps<{ errores: Record<string, string>; enviando: boolean; opciones: OpcionDeRegistro[] }>();
const emit = defineEmits<{ cerrar: []; confirmar: [] }>();
const edicion = defineModel<EdicionDeCambioDeFormulario>({ required: true });

const caja = 'size-5 shrink-0 accent-campo-700';
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" :titulo="`Papel del ${edicion.titulo}`" @cerrar="emit('cerrar')">
    <form id="form-cambio-de-formulario" class="space-y-4" @submit.prevent="emit('confirmar')">
      <fieldset class="space-y-2">
        <legend class="text-sm font-medium">¿Dónde está el formulario?</legend>
        <label v-if="edicion.puedePasar" class="flex items-start gap-3 text-sm">
          <input v-model="edicion.destino" type="radio" value="inutilizar" :class="caja" />
          <span>Sigue en la empresa (se arruinó o salió mal): el pago pasa a otro formulario.</span>
        </label>
        <label class="flex items-start gap-3 text-sm">
          <input v-model="edicion.destino" type="radio" value="extraviado" :class="caja" />
          <span>Se perdió, se firmó o se entregó: se anula como extraviado.</span>
        </label>
      </fieldset>

      <template v-if="edicion.destino === 'inutilizar'">
        <CampoSelector
          v-model="edicion.chequeDestinoId"
          etiqueta="El pago pasa al cheque"
          :opciones="opciones"
          requerido
          :error="errores.chequeDestinoId"
        />
        <p v-if="!opciones.length" class="text-sm text-red-700 dark:text-red-300" role="alert">
          La cuenta no tiene cheques disponibles en una chequera activa. Registre una chequera nueva en la cuenta o, si
          el papel ya no está en la empresa, anúlelo como extraviado.
        </p>
        <label class="flex items-start gap-3 text-sm">
          <input v-model="edicion.enCustodia" type="checkbox" :class="caja" />
          <span
            >El formulario {{ edicion.titulo.replace('cheque ', '') }} está en poder de la empresa: no se firmó ni se
            entregó.</span
          >
        </label>
        <label class="flex items-start gap-3 text-sm">
          <input v-model="edicion.papelConservado" type="checkbox" :class="caja" />
          <span>Lo crucé con ANULADO, recorté la zona de firma y lo archivo con el comprobante de egreso.</span>
        </label>
      </template>
      <template v-else>
        <p v-if="!edicion.puedePasar" class="text-sm text-tierra-700 dark:text-tierra-300">
          Este cheque ya no admite pasar su pago a otro formulario (su movimiento ya pasó por el banco), pero sí se
          puede declarar extraviado.
        </p>
        <CampoTexto
          v-model="edicion.fecha"
          etiqueta="Fecha"
          tipo="date"
          requerido
          ayuda="Fecha del movimiento inverso: solo cuenta si el mes del cheque ya está conciliado."
          :error="errores.fecha"
        />
      </template>

      <p class="rounded-lg bg-trigo-300/30 p-3 text-sm text-tierra-900 dark:bg-trigo-500/10 dark:text-trigo-300">
        {{ resumenDelCambio(edicion) }}
      </p>
      <CampoTexto v-model="edicion.motivo" etiqueta="Motivo" multilinea requerido :error="errores.motivo" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase
        tipo="submit"
        form="form-cambio-de-formulario"
        :variante="edicion.destino === 'extraviado' ? 'peligro' : 'primario'"
        :cargando="enviando"
        :deshabilitado="!sePuedeConfirmar(edicion)"
      >
        {{ textoDeConfirmar(edicion.destino) }}
      </BotonBase>
    </template>
  </VentanaModal>
</template>
