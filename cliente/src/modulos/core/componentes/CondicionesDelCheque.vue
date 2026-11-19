<script setup lang="ts">
import CampoInterruptor from './CampoInterruptor.vue';

/**
 * Las dos condiciones con que sale un cheque, siempre juntas y con la misma ayuda en todas las pantallas que emiten
 * (Bancos, pagos y retiros de Cuentas por pagar): «No negociable» (marcada por omisión) y «Para abono en cuenta»
 * (apagada por omisión). Se ven en el papel y en el comprobante; si el formulario ya trae la leyenda impresa, la
 * impresión avisa.
 */
const noNegociable = defineModel<boolean>('noNegociable', { required: true });
const paraAbonoEnCuenta = defineModel<boolean>('paraAbonoEnCuenta', { required: true });
</script>

<template>
  <div class="space-y-3">
    <CampoInterruptor
      v-model="noNegociable"
      etiqueta="No negociable"
      descripcion="No se puede endosar: solo lo cobra quien figura en el cheque (arts. 498 y 499 del Código de Comercio). Se recomienda dejarlo marcado."
    />
    <CampoInterruptor
      v-model="paraAbonoEnCuenta"
      etiqueta="Para abono en cuenta"
      descripcion="El banco no lo paga en efectivo: solo lo acredita en la cuenta del beneficiario (art. 521). Déjelo apagado si el beneficiario lo va a cobrar en ventanilla."
    />
  </div>
</template>
