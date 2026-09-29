<script setup lang="ts">
import { Inbox } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import VentanaDeMotivo from '../componentes/VentanaDeMotivo.vue';
import FiltrosDeCheques from '../componentes/cheques/FiltrosDeCheques.vue';
import TarjetaDeChequeListado from '../componentes/cheques/TarjetaDeChequeListado.vue';
import VentanaDeCheque from '../componentes/cheques/VentanaDeCheque.vue';
import { usarBajasDeCheque } from '../composables/cheques/usar-bajas-de-cheque';
import { usarListaDeChequesDeLaEmpresa } from '../composables/cheques/usar-lista-de-cheques-de-la-empresa';
import type { ChequeListado } from '../servicios/cheques.api';
import { VENTANAS_BANCOS } from '../textos';
import { TEXTO_DE_ANULACION, TEXTO_DE_BLANQUEO } from '../composables/cheques/textos-de-baja-de-cheque';

const ventana = VENTANAS_BANCOS.cheques;
const { cheques, cargando, filtros, opcionesDeCuenta, referencias, emision, cargar } = usarListaDeChequesDeLaEmpresa();
const { anulacion, blanqueo } = usarBajasDeCheque<ChequeListado>(cargar);
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
        <TarjetaDeChequeListado
          :registro="registro"
          @anular="anulacion.abrir(registro)"
          @blanquear="blanqueo.abrir(registro)"
        />
      </li>
    </ul>

    <VentanaDeCheque
      v-model="emision.edicion.value"
      :referencias="referencias"
      :opciones-de-cheque="emision.opcionesDeCheque.value"
      :opciones-de-concepto="emision.opcionesDeConcepto.value"
      :errores="emision.errores.value"
      :enviando="emision.enviando.value"
      @cerrar="emision.edicion.value.abierta = false"
      @guardar="emision.guardar"
    />
    <VentanaDeMotivo
      v-model:motivo="anulacion.motivo"
      v-model:fecha="anulacion.fecha"
      con-fecha
      :abierta="!!anulacion.registro"
      titulo="Anular cheque"
      :texto="TEXTO_DE_ANULACION(anulacion.registro?.numero)"
      :errores="anulacion.errores"
      :enviando="anulacion.enviando"
      @cerrar="anulacion.cerrar"
      @confirmar="anulacion.confirmar"
    />
    <VentanaDeMotivo
      v-model:motivo="blanqueo.motivo"
      :abierta="!!blanqueo.registro"
      titulo="Blanquear cheque"
      accion="Blanquear"
      :texto="TEXTO_DE_BLANQUEO(blanqueo.registro?.numero)"
      :errores="blanqueo.errores"
      :enviando="blanqueo.enviando"
      @cerrar="blanqueo.cerrar"
      @confirmar="blanqueo.confirmar"
    />
  </div>
</template>
