<script setup lang="ts">
import { computed } from 'vue';
import { Info } from 'lucide-vue-next';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import {
  esFacturaEspecial,
  esNotaDeDebito,
  esReciboFel,
  familiaDelCodigo,
} from '../../composables/documentos/tipos-de-documento-sat';
import type { EdicionDeDocumento } from '../../composables/documentos/edicion-de-documento';
import {
  alCambiarElMotivo,
  alMarcarLaCasilla,
  opcionesDeMotivo,
} from '../../composables/documentos/reglas-del-formulario-de-documento';
import CamposDeFacturaEspecial from './CamposDeFacturaEspecial.vue';
import { textoFueraDelLibro } from '../../textos-de-documentos';

/** La FEL: NIT del emisor y autorización, o por qué el documento no se muestra en los reportes de la SAT. */
defineProps<{ nitDeLaEmpresa: string | null; errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeDocumento>({ required: true });

const motivos = opcionesDeMotivo();
const esEspecial = computed(() => esFacturaEspecial(edicion.value.tipoDte));
const esDebito = computed(() => esNotaDeDebito(edicion.value.tipoDte));
const esRecibo = computed(() => familiaDelCodigo(edicion.value.tipoDte) === 'recibo');
const esReciboDeLaEmpresa = computed(() => esReciboFel(edicion.value.tipoDte));
const conFel = computed(() => edicion.value.muestraEnReportesSat || edicion.value.motivoFueraDelLibro !== 'sin_fel');
const explicacion = computed(() => {
  const motivo = edicion.value.motivoFueraDelLibro;
  return motivo ? textoFueraDelLibro(motivo) : null;
});

const descripcionDeLaCasilla = computed(() => {
  if (esReciboDeLaEmpresa.value)
    return 'El recibo FEL a nombre de la empresa no va en el libro de IVA: se registra aparte.';
  if (esRecibo.value) return 'Un recibo no es un documento FEL: nunca se muestra en los reportes de la SAT.';
  if (esDebito.value) return 'La nota de débito siempre se muestra en los reportes de la SAT.';
  return 'Déjelo activado cuando la FEL está a nombre de la empresa. Desactívelo solo si el documento no se reporta a la SAT.';
});

const marcar = (marcada: boolean) => alMarcarLaCasilla(edicion.value, marcada);

function elegirMotivo(motivo: EdicionDeDocumento['motivoFueraDelLibro'] | undefined): void {
  edicion.value.motivoFueraDelLibro = motivo ?? null;
  alCambiarElMotivo(edicion.value);
}
</script>

<template>
  <CamposDeFacturaEspecial v-if="esEspecial" v-model="edicion" :nit-de-la-empresa="nitDeLaEmpresa" :errores="errores" />
  <div v-else class="space-y-4">
    <CampoInterruptor
      :model-value="edicion.muestraEnReportesSat"
      etiqueta="Se muestra en reportes SAT"
      :descripcion="descripcionDeLaCasilla"
      :deshabilitado="esRecibo || esDebito"
      @update:model-value="marcar"
    />

    <div v-if="!edicion.muestraEnReportesSat" class="space-y-3">
      <CampoSelector
        v-if="!esReciboDeLaEmpresa"
        :model-value="edicion.motivoFueraDelLibro"
        etiqueta="¿Por qué no se muestra en reportes SAT?"
        requerido
        :opciones="motivos"
        :error="errores.motivoFueraDelLibro"
        @update:model-value="elegirMotivo"
      />
      <p v-if="explicacion" class="flex gap-2 text-sm text-tierra-700 dark:text-tierra-200">
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ explicacion }}</span>
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <CampoTexto
        v-if="edicion.muestraEnReportesSat"
        v-model="edicion.nitEmisor"
        etiqueta="NIT del emisor"
        requerido
        ayuda="Como aparece en la factura. Si el proveedor no tenía NIT registrado, se le guarda este."
        :error="errores.nitEmisor"
        sin-correccion
      />
      <CampoTexto
        v-if="conFel"
        v-model="edicion.autorizacionFel"
        etiqueta="Autorización de la FEL"
        :requerido="edicion.muestraEnReportesSat || esReciboDeLaEmpresa"
        ayuda="El número de autorización (UUID) que trae la factura."
        :error="errores.autorizacionFel"
        sin-correccion
      />
      <CampoTexto
        v-if="!edicion.muestraEnReportesSat && conFel"
        v-model="edicion.nitReceptor"
        etiqueta="NIT o CUI al que se emitió"
        :placeholder="esReciboDeLaEmpresa ? 'Se propone el NIT de su empresa' : 'CF si fue a consumidor final'"
        :error="errores.nitReceptor"
        sin-correccion
      />
    </div>
  </div>
</template>
