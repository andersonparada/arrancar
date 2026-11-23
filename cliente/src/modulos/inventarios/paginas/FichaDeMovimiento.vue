<script setup lang="ts">
import { Printer } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import FichaNoEncontrada from '@/modulos/core/componentes/FichaNoEncontrada.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import VentanaDeMotivo from '../componentes/compartido/VentanaDeMotivo.vue';
import RenglonesDelDocumento from '../componentes/documentos/RenglonesDelDocumento.vue';
import {
  detallesDeLaFicha,
  PERMISO_DE_ANULACION,
  tituloDeDocumento,
} from '../composables/documentos/detalles-de-documento';
import { usarFichaDeDocumento } from '../composables/documentos/usar-ficha-de-documento';
import { VENTANAS_INVENTARIOS } from '../textos';

const props = defineProps<{ documentoId: string }>();

const { documento, cargando, edicion, enviando, errores, abrir, guardar } = usarFichaDeDocumento(props.documentoId);
const imprimir = () => window.print();
const volver = {
  texto: `Volver a ${VENTANAS_INVENTARIOS.movimientos.titulo}`,
  ruta: { name: 'inventarios.movimientos' },
};
</script>

<template>
  <div v-if="documento" class="space-y-4">
    <EncabezadoPagina :titulo="tituloDeDocumento(documento)" descripcion="Movimiento de inventario" :volver="volver">
      <InsigniaBase v-if="documento.estado === 'anulado'" tono="rojo">Anulado</InsigniaBase>
      <BotonBase variante="secundario" :icono="Printer" class="print:hidden" @click="imprimir"> Imprimir </BotonBase>
      <span v-if="documento.estado === 'vigente'" v-permiso="PERMISO_DE_ANULACION[documento.clase]" class="contents">
        <BotonBase variante="secundario" class="print:hidden" @click="abrir">Anular</BotonBase>
      </span>
    </EncabezadoPagina>

    <ul
      v-if="documento.avisos.length"
      role="status"
      class="space-y-1 rounded-lg bg-trigo-300/30 px-3 py-2 text-sm dark:bg-trigo-500/20"
    >
      <li v-for="aviso in documento.avisos" :key="aviso">{{ aviso }}</li>
    </ul>
    <DatosDelRegistro :detalles="detallesDeLaFicha(documento)" />
    <RenglonesDelDocumento :renglones="documento.renglones" />

    <VentanaDeMotivo
      v-model="edicion"
      :titulo="`Anular ${tituloDeDocumento(documento)}`"
      resumen="Se anulará el documento y sus movimientos dejarán de contar en el kardex; el costo se recalcula desde su fecha. Si al quitarlo alguna existencia quedara negativa, el sistema no lo permite y le dirá cuál. Solo se puede en un mes abierto."
      texto-del-boton="Anular"
      :enviando="enviando"
      :errores="errores"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
  <FichaNoEncontrada v-else titulo="Movimiento" :volver="volver" />
</template>
