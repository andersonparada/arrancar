<script setup lang="ts">
import { computed } from 'vue';
import { ArrowLeftRight, Inbox } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import VentanaDeAnulacion from '../componentes/VentanaDeAnulacion.vue';
import FiltrosDeMovimientos from '../componentes/movimientos/FiltrosDeMovimientos.vue';
import TarjetaDeTransferencia from '../componentes/transferencias/TarjetaDeTransferencia.vue';
import VentanaDeTransferencia from '../componentes/transferencias/VentanaDeTransferencia.vue';
import { usarReferenciasDeCuenta } from '../composables/cuentas-bancarias/referencias-de-cuenta';
import { usarAnulacionDeTransferencia } from '../composables/transferencias/usar-anulacion-de-transferencia';
import { usarListaDeTransferencias } from '../composables/transferencias/usar-lista-de-transferencias';
import { usarReferenciasDeTransferencia } from '../composables/transferencias/referencias-de-transferencia';
import { usarFormularioDeTransferencia } from '../composables/transferencias/usar-formulario-de-transferencia';
import { VENTANAS_BANCOS } from '../textos';

const ventana = VENTANAS_BANCOS.transferencias;
const { registros, cargando, filtros, cargar } = usarListaDeTransferencias();
const { filtroDeCuenta: opcionesDeCuenta, cuentasBancarias } = usarReferenciasDeCuenta();
const { edicion, enviando, errores, nueva, guardar } = usarFormularioDeTransferencia(cargar);
const origenElegido = computed(() => edicion.value.cuentaOrigenId);
const referencias = usarReferenciasDeTransferencia(cuentasBancarias, origenElegido);
const {
  registro: transferenciaAAnular,
  motivo: motivoDeAnulacion,
  enviando: anulando,
  errores: erroresDeAnulacion,
  abrir: abrirAnulacion,
  cerrar: cerrarAnulacion,
  confirmar: confirmarAnulacion,
} = usarAnulacionDeTransferencia(cargar);
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <BotonBase v-permiso="'bancos.transferencias.gestionar'" :icono="ArrowLeftRight" @click="nueva()">
        Nueva transferencia
      </BotonBase>
    </EncabezadoPagina>

    <FiltrosDeMovimientos v-model="filtros" :opciones-de-cuenta="opcionesDeCuenta" />

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!registros.length" :icono="Inbox" titulo="Todavía no hay transferencias" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id" :class="registro.anuladaEn ? 'opacity-60' : ''">
        <TarjetaDeTransferencia :registro="registro" @anular="abrirAnulacion(registro)" />
      </li>
    </ul>

    <VentanaDeTransferencia
      v-model="edicion"
      :referencias="referencias"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
    <VentanaDeAnulacion
      v-model:motivo="motivoDeAnulacion"
      :abierta="!!transferenciaAAnular"
      titulo="Anular transferencia"
      texto="¿Anular esta transferencia? Se anulan sus dos notas. Esta acción no se puede deshacer."
      :errores="erroresDeAnulacion"
      :enviando="anulando"
      @cerrar="cerrarAnulacion"
      @anular="confirmarAnulacion"
    />
  </div>
</template>
