<script setup lang="ts">
import { Ban, FilePlus2, HandCoins, Inbox, Printer, ReceiptText, Undo2 } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { rutaDeIngresoDeFactura } from '../composables/anticipos/ficha-de-anticipo';
import type { Anticipo } from '../servicios/anticipos.api';

/**
 * Los botones de la ficha: solo se muestran si hay permiso y si el servidor dice que se puede (liquidar, reabrir, anular);
 * agregar gastos solo tiene sentido con el anticipo abierto.
 */
const props = defineProps<{ ficha: Anticipo; conGastoSinDocumento: boolean }>();
defineEmits<{ sinDocumento: []; reabrir: []; anular: [] }>();
const router = useRouter();
const abierto = () => props.ficha.estado === 'abierto';
const irA = (name: string) => router.push({ name, params: { id: props.ficha.id } });
const agregarFactura = () => router.push(rutaDeIngresoDeFactura(props.ficha));
const irALaBandeja = () => router.push({ name: 'cuentas-por-liquidar.bandeja', query: { anticipo: props.ficha.id } });
</script>

<template>
  <span v-if="abierto()" v-permiso="'cuentas-por-liquidar.gastos.crear'" class="contents">
    <span v-permiso="'libro-de-compras.documentos.crear'" class="contents">
      <BotonBase :icono="FilePlus2" @click="agregarFactura">Agregar factura</BotonBase>
    </span>
    <BotonBase variante="secundario" :icono="Inbox" @click="irALaBandeja">Desde la bandeja</BotonBase>
    <BotonBase v-if="conGastoSinDocumento" variante="secundario" :icono="ReceiptText" @click="$emit('sinDocumento')">
      Gasto sin documento
    </BotonBase>
  </span>
  <span v-if="ficha.puedeLiquidar" v-permiso="'cuentas-por-liquidar.anticipos.liquidar'" class="contents">
    <BotonBase :icono="HandCoins" @click="irA('cuentas-por-liquidar.anticipos.liquidar')">Liquidar</BotonBase>
  </span>
  <BotonBase
    v-if="ficha.estado === 'liquidado'"
    variante="secundario"
    :icono="Printer"
    @click="irA('cuentas-por-liquidar.anticipos.imprimir')"
  >
    Imprimir liquidación
  </BotonBase>
  <span v-if="ficha.puedeReabrir" v-permiso="'cuentas-por-liquidar.anticipos.liquidar'" class="contents">
    <BotonBase variante="secundario" :icono="Undo2" @click="$emit('reabrir')">Reabrir</BotonBase>
  </span>
  <span v-if="ficha.puedeAnular" v-permiso="'cuentas-por-liquidar.anticipos.anular'" class="contents">
    <BotonBase variante="peligro" :icono="Ban" @click="$emit('anular')">Anular</BotonBase>
  </span>
</template>
