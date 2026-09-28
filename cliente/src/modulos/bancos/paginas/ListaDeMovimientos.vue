<script setup lang="ts">
import { ArrowLeftRight, Inbox, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import { computed } from 'vue';
import VentanaDeAnulacion from '../componentes/VentanaDeAnulacion.vue';
import FiltrosDeMovimientos from '../componentes/movimientos/FiltrosDeMovimientos.vue';
import TarjetaDeMovimiento from '../componentes/movimientos/TarjetaDeMovimiento.vue';
import VentanaDeMovimiento from '../componentes/movimientos/VentanaDeMovimiento.vue';
import VentanaDeTransferencia from '../componentes/transferencias/VentanaDeTransferencia.vue';
import { usarAnulacionDeMovimiento } from '../composables/movimientos/usar-anulacion-de-movimiento';
import { usarMovimientos } from '../composables/movimientos/usar-movimientos';
import { VENTANAS_BANCOS } from '../textos';

const ventana = VENTANAS_BANCOS.movimientos;
const PERMISOS_DE_INTERCAMBIO = { importar: 'bancos.movimientos.importar' };
const {
  registros,
  cargando,
  filtros,
  opcionesDeCuenta,
  intercambio,
  referencias,
  edicion,
  enviando,
  errores,
  nuevo,
  editar,
  guardar,
  cargar,
  transferencia,
  referenciasDeTransferencia,
} = usarMovimientos();
const {
  registro: movimientoAAnular,
  motivo: motivoDeAnulacion,
  enviando: anulando,
  errores: erroresDeAnulacion,
  abrir: abrirAnulacion,
  cerrar: cerrarAnulacion,
  confirmar: confirmarAnulacion,
} = usarAnulacionDeMovimiento(cargar);

const textoDeAnulacion = computed(() =>
  movimientoAAnular.value?.transferenciaId
    ? '¿Anular esta transferencia? Se anulan sus dos notas. Esta acción no se puede deshacer.'
    : `¿Anular el movimiento «${movimientoAAnular.value?.referencia ?? ''}»? Esta acción no se puede deshacer.`,
);
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio :permisos="PERMISOS_DE_INTERCAMBIO" @importar="intercambio.abrir" />
      <BotonBase
        v-permiso="'bancos.movimientos.gestionar'"
        variante="secundario"
        :icono="Plus"
        @click="nuevo('credito')"
      >
        Nota de crédito
      </BotonBase>
      <BotonBase v-permiso="'bancos.movimientos.gestionar'" :icono="Plus" @click="nuevo('debito')">
        Nota de débito
      </BotonBase>
      <BotonBase
        v-permiso="'bancos.transferencias.gestionar'"
        variante="secundario"
        :icono="ArrowLeftRight"
        @click="transferencia.nueva()"
      >
        Transferencia
      </BotonBase>
    </EncabezadoPagina>

    <FiltrosDeMovimientos v-model="filtros" :opciones-de-cuenta="opcionesDeCuenta" />

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!registros.length" :icono="Inbox" titulo="Todavía no hay movimientos" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id" :class="registro.anuladoEn ? 'opacity-60' : ''">
        <TarjetaDeMovimiento :registro="registro" @editar="editar(registro)" @anular="abrirAnulacion(registro)" />
      </li>
    </ul>

    <VentanaDeMovimiento
      v-model="edicion"
      :referencias="referencias"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
    <VentanaDeAnulacion
      v-model:motivo="motivoDeAnulacion"
      :abierta="!!movimientoAAnular"
      :titulo="movimientoAAnular?.transferenciaId ? 'Anular transferencia' : 'Anular movimiento'"
      :texto="textoDeAnulacion"
      :errores="erroresDeAnulacion"
      :enviando="anulando"
      @cerrar="cerrarAnulacion"
      @anular="confirmarAnulacion"
    />
    <VentanaDeTransferencia
      v-model="transferencia.edicion.value"
      :referencias="referenciasDeTransferencia"
      :errores="transferencia.errores.value"
      :enviando="transferencia.enviando.value"
      @cerrar="transferencia.edicion.value.abierta = false"
      @guardar="transferencia.guardar"
    />
    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar movimientos"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
