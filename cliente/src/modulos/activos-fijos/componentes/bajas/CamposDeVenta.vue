<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { EdicionDeBaja } from '../../composables/bajas/edicion-de-baja';

/** Los datos de la venta: el comprador, el precio, la factura (FEL) y, solo para el contador, el costo fiscal. */
defineProps<{ errores: Record<string, string>; puedeEscribirElCosto: boolean }>();
const edicion = defineModel<EdicionDeBaja>({ required: true });
</script>

<template>
  <fieldset class="space-y-4 rounded-xl border border-tierra-200 p-3 dark:border-tierra-700">
    <legend class="px-1 text-sm font-medium">Venta</legend>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CampoTexto
        v-model="edicion.comprador"
        etiqueta="Comprador"
        requerido
        :longitud-maxima="150"
        :error="errores['venta.comprador']"
      />
      <CampoTexto
        v-model="edicion.nitDelComprador"
        etiqueta="NIT del comprador"
        requerido
        :longitud-maxima="20"
        :error="errores['venta.nitDelComprador']"
      />
      <CampoTexto
        v-model="edicion.precio"
        etiqueta="Precio sin IVA"
        requerido
        paso="any"
        ayuda="Es lo que cuenta como ingreso de la venta."
        :error="errores['venta.precio']"
      />
      <CampoTexto
        v-model="edicion.iva"
        etiqueta="IVA de la factura"
        requerido
        paso="any"
        ayuda="Pequeño contribuyente: 0.00, su factura no desglosa IVA."
        :error="errores['venta.iva']"
      />
      <CampoTexto v-model="edicion.serieFel" etiqueta="Serie de la factura" :longitud-maxima="60" />
      <CampoTexto
        v-model="edicion.numeroFel"
        etiqueta="Número de la factura"
        requerido
        :longitud-maxima="60"
        :error="errores['venta.numeroFel']"
      />
    </div>
    <CampoTexto
      v-model="edicion.autorizacionFel"
      etiqueta="Autorización de la factura"
      requerido
      sin-correccion
      ayuda="El identificador largo (UUID) que sale en la factura electrónica."
      :error="errores['venta.autorizacionFel']"
    />
    <template v-if="puedeEscribirElCosto">
      <CampoInterruptor
        v-model="edicion.costoDelContador"
        etiqueta="Sostener el costo fiscal por criterio del contador"
        descripcion="Por omisión el sistema lo calcula. Si lo escribe usted, queda en la auditoría con su motivo."
      />
      <template v-if="edicion.costoDelContador">
        <CampoTexto
          v-model="edicion.costoFiscal"
          etiqueta="Costo fiscal"
          requerido
          paso="any"
          :error="errores['costoFiscalDelContador.monto']"
        />
        <CampoTexto
          v-model="edicion.motivoDelCosto"
          etiqueta="Motivo y documento que lo respalda"
          multilinea
          requerido
          :longitud-maxima="300"
          contar
          :error="errores['costoFiscalDelContador.motivo']"
        />
      </template>
    </template>
  </fieldset>
</template>
