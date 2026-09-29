<script setup lang="ts">
import { Inbox } from 'lucide-vue-next';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import VentanaDeMotivo from '../componentes/VentanaDeMotivo.vue';
import AccionesDeNotas from '../componentes/notas/AccionesDeNotas.vue';
import TarjetaDeNota from '../componentes/notas/TarjetaDeNota.vue';
import VentanaDeNota from '../componentes/notas/VentanaDeNota.vue';
import FiltrosDeMovimientos from '../componentes/movimientos/FiltrosDeMovimientos.vue';
import { usarReferenciasDeCuenta } from '../composables/cuentas-bancarias/referencias-de-cuenta';
import { usarBajasDeNota } from '../composables/notas/usar-bajas-de-nota';
import { usarFormularioDeNota } from '../composables/notas/usar-formulario-de-nota';
import { usarListaDeNotas } from '../composables/notas/usar-lista-de-notas';
import { VENTANAS_BANCOS } from '../textos';

const ventana = VENTANAS_BANCOS.notas;
const { registros, cargando, filtros, cargar } = usarListaDeNotas();
const { campos: referencias, filtroDeCuenta: opcionesDeCuenta } = usarReferenciasDeCuenta();
const { edicion, enviando, errores, opcionesDeConceptos, conceptoSugerido, nueva, editar, guardar } =
  usarFormularioDeNota(cargar, () => registros.value);
const { anulacion, eliminacion } = usarBajasDeNota(cargar);
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
      <li v-for="registro in registros" :key="registro.id" :class="registro.revertidoEn ? 'opacity-60' : ''">
        <TarjetaDeNota
          :registro="registro"
          @editar="editar(registro)"
          @anular="anulacion.abrir(registro)"
          @eliminar="eliminacion.abrir(registro)"
        />
      </li>
    </ul>

    <VentanaDeNota
      v-model="edicion"
      :referencias="referencias"
      :opciones-de-concepto="opcionesDeConceptos"
      :concepto-sugerido="conceptoSugerido"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
    <VentanaDeMotivo
      v-model:motivo="anulacion.motivo"
      v-model:fecha="anulacion.fecha"
      con-fecha
      :abierta="!!anulacion.registro"
      titulo="Anular nota"
      :texto="`Se creará el movimiento inverso de la nota «${anulacion.registro?.referencia ?? ''}»; nada se borra.`"
      :errores="anulacion.errores"
      :enviando="anulacion.enviando"
      @cerrar="anulacion.cerrar"
      @confirmar="anulacion.confirmar"
    />
    <VentanaDeMotivo
      v-model:motivo="eliminacion.motivo"
      :abierta="!!eliminacion.registro"
      titulo="Eliminar nota"
      accion="Eliminar"
      :texto="`¿Eliminar la nota «${eliminacion.registro?.referencia ?? ''}»? Se borra de verdad y queda en la auditoría.`"
      :errores="eliminacion.errores"
      :enviando="eliminacion.enviando"
      @cerrar="eliminacion.cerrar"
      @confirmar="eliminacion.confirmar"
    />
  </div>
</template>
