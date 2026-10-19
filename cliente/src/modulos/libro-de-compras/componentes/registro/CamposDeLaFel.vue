<script setup lang="ts">
import { computed } from 'vue';
import { Info } from 'lucide-vue-next';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { EdicionDeDocumento } from '../../composables/documentos/edicion-de-documento';
import { alCambiarElMotivo, alMarcarLaCasilla } from '../../composables/documentos/reglas-del-formulario-de-documento';
import { textoFueraDelLibro } from '../../textos-de-documentos';
import { OPCIONES_DE_MOTIVO_FUERA_DEL_LIBRO } from '../../textos-del-registro';

/** La FEL: NIT del emisor y autorización, o por qué el documento no se muestra en los reportes de la SAT. */
defineProps<{ errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeDocumento>({ required: true });

const motivos = Object.entries(OPCIONES_DE_MOTIVO_FUERA_DEL_LIBRO)
  .map(([valor, texto]) => ({ valor: valor as NonNullable<EdicionDeDocumento['motivoFueraDelLibro']>, texto }))
  .sort((a, b) => a.texto.localeCompare(b.texto, 'es'));
const esRecibo = computed(() => edicion.value.tipo === 'recibo');
const conFel = computed(() => edicion.value.muestraEnReportesSat || edicion.value.motivoFueraDelLibro !== 'sin_fel');
const explicacion = computed(() => {
  const motivo = edicion.value.motivoFueraDelLibro;
  return motivo ? textoFueraDelLibro(motivo) : null;
});

const marcar = (marcada: boolean) => alMarcarLaCasilla(edicion.value, marcada);

function elegirMotivo(motivo: EdicionDeDocumento['motivoFueraDelLibro'] | undefined): void {
  edicion.value.motivoFueraDelLibro = motivo ?? null;
  alCambiarElMotivo(edicion.value);
}
</script>

<template>
  <div class="space-y-4">
    <CampoInterruptor
      :model-value="edicion.muestraEnReportesSat"
      etiqueta="Se muestra en reportes SAT"
      :descripcion="
        esRecibo
          ? 'Un recibo no es un documento FEL: nunca se muestra en los reportes de la SAT.'
          : 'Déjelo activado cuando la FEL está a nombre de la empresa. Desactívelo solo si el documento no se reporta a la SAT.'
      "
      :deshabilitado="esRecibo"
      @update:model-value="marcar"
    />

    <div v-if="!edicion.muestraEnReportesSat" class="space-y-3">
      <CampoSelector
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
        :requerido="edicion.muestraEnReportesSat"
        ayuda="El número de autorización (UUID) que trae la factura."
        :error="errores.autorizacionFel"
        sin-correccion
      />
      <CampoTexto
        v-if="!edicion.muestraEnReportesSat && conFel"
        v-model="edicion.nitReceptor"
        etiqueta="NIT o CUI al que se emitió"
        placeholder="CF si fue a consumidor final"
        :error="errores.nitReceptor"
        sin-correccion
      />
    </div>
  </div>
</template>
