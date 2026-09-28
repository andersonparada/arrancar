<script setup lang="ts">
import { Inbox } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import VentanaDeAnulacion from '../componentes/VentanaDeAnulacion.vue';
import FiltrosDeCheques from '../componentes/cheques/FiltrosDeCheques.vue';
import TarjetaDeChequeListado from '../componentes/cheques/TarjetaDeChequeListado.vue';
import VentanaDeCheque from '../componentes/cheques/VentanaDeCheque.vue';
import { usarAnulacionDeChequeListado } from '../composables/cheques/usar-anulacion-de-cheque-listado';
import { usarListaDeChequesDeLaEmpresa } from '../composables/cheques/usar-lista-de-cheques-de-la-empresa';
import { VENTANAS_BANCOS } from '../textos';

const ventana = VENTANAS_BANCOS.cheques;
const { cheques, cargando, filtros, opcionesDeCuenta, referencias, emision, cargar } = usarListaDeChequesDeLaEmpresa();
const {
  registro: chequeAAnular,
  motivo,
  enviando: anulando,
  errores: erroresDeAnulacion,
  abrir,
  cerrar,
  confirmar,
} = usarAnulacionDeChequeListado(cargar);
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <BotonBase v-permiso="'bancos.cheques.emitir'" @click="emision.nueva()">{{ ventana.nuevo }}</BotonBase>
    </EncabezadoPagina>

    <FiltrosDeCheques v-model="filtros" :opciones-de-cuenta="opcionesDeCuenta" />

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!cheques.length" :icono="Inbox" titulo="No hay cheques con ese filtro" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in cheques" :key="registro.id">
        <TarjetaDeChequeListado :registro="registro" @anular="abrir(registro)" />
      </li>
    </ul>

    <VentanaDeCheque
      v-model="emision.edicion.value"
      :referencias="referencias"
      :opciones-de-cheque="emision.opcionesDeCheque.value"
      :errores="emision.errores.value"
      :enviando="emision.enviando.value"
      @cerrar="emision.edicion.value.abierta = false"
      @guardar="emision.guardar"
    />
    <VentanaDeAnulacion
      v-model:motivo="motivo"
      :abierta="!!chequeAAnular"
      titulo="Anular cheque"
      :texto="`¿Anular el cheque No. ${chequeAAnular?.numero ?? ''}? Esta acción no se puede deshacer.`"
      :errores="erroresDeAnulacion"
      :enviando="anulando"
      @cerrar="cerrar"
      @anular="confirmar"
    />
  </div>
</template>
