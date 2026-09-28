<script setup lang="ts">
import { Inbox } from 'lucide-vue-next';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import VentanaDeAnulacion from '../componentes/VentanaDeAnulacion.vue';
import AccionesDeNotas from '../componentes/notas/AccionesDeNotas.vue';
import TarjetaDeNota from '../componentes/notas/TarjetaDeNota.vue';
import VentanaDeNota from '../componentes/notas/VentanaDeNota.vue';
import FiltrosDeMovimientos from '../componentes/movimientos/FiltrosDeMovimientos.vue';
import { usarReferenciasDeCuenta } from '../composables/cuentas-bancarias/referencias-de-cuenta';
import { usarAnulacionDeNota } from '../composables/notas/usar-anulacion-de-nota';
import { usarFormularioDeNota } from '../composables/notas/usar-formulario-de-nota';
import { usarListaDeNotas } from '../composables/notas/usar-lista-de-notas';
import { VENTANAS_BANCOS } from '../textos';

const ventana = VENTANAS_BANCOS.notas;
const { registros, cargando, filtros, cargar } = usarListaDeNotas();
const { campos: referencias, filtroDeCuenta: opcionesDeCuenta } = usarReferenciasDeCuenta();
const { edicion, enviando, errores, nueva, editar, guardar } = usarFormularioDeNota(cargar);
const {
  registro: notaAAnular,
  motivo: motivoDeAnulacion,
  enviando: anulando,
  errores: erroresDeAnulacion,
  abrir: abrirAnulacion,
  cerrar: cerrarAnulacion,
  confirmar: confirmarAnulacion,
} = usarAnulacionDeNota(cargar);
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeNotas @credito="nueva('credito')" @debito="nueva('debito')" />
    </EncabezadoPagina>

    <FiltrosDeMovimientos v-model="filtros" :opciones-de-cuenta="opcionesDeCuenta" />

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!registros.length" :icono="Inbox" titulo="Todavía no hay notas" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id" :class="registro.anuladoEn ? 'opacity-60' : ''">
        <TarjetaDeNota :registro="registro" @editar="editar(registro)" @anular="abrirAnulacion(registro)" />
      </li>
    </ul>

    <VentanaDeNota
      v-model="edicion"
      :referencias="referencias"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
    <VentanaDeAnulacion
      v-model:motivo="motivoDeAnulacion"
      :abierta="!!notaAAnular"
      titulo="Anular nota"
      :texto="`¿Anular la nota «${notaAAnular?.referencia ?? ''}»? Esta acción no se puede deshacer.`"
      :errores="erroresDeAnulacion"
      :enviando="anulando"
      @cerrar="cerrarAnulacion"
      @anular="confirmarAnulacion"
    />
  </div>
</template>
