<script setup lang="ts">
import { Inbox } from 'lucide-vue-next';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import VentanaDeMotivo from '../componentes/VentanaDeMotivo.vue';
import TarjetaDeCheque from '../componentes/cheques/TarjetaDeCheque.vue';
import { usarBajasDeCheque } from '../composables/cheques/usar-bajas-de-cheque';
import { TEXTO_DE_ANULACION, TEXTO_DE_BLANQUEO } from '../composables/cheques/textos-de-baja-de-cheque';
import { usarListaDeCheques } from '../composables/cheques/usar-lista-de-cheques';
import type { Cheque } from '../servicios/cheques.api';

const props = defineProps<{ chequeraId: string }>();
const { cheques, cargando, cargar, estado } = usarListaDeCheques(props.chequeraId);
const { anulacion, blanqueo } = usarBajasDeCheque<Cheque>(cargar);

const OPCIONES_DE_ESTADO = [
  { valor: '' as const, texto: 'Todos' },
  { valor: 'disponible' as const, texto: 'Disponibles' },
  { valor: 'emitido' as const, texto: 'Emitidos' },
  { valor: 'anulado' as const, texto: 'Anulados' },
];
const volver = { texto: 'Volver a cuentas bancarias', ruta: { name: 'bancos.cuentas-bancarias' } };
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina
      titulo="Cheques de la chequera"
      descripcion="Sus cheques, disponibles, emitidos y anulados."
      :volver="volver"
    />
    <CampoSelector v-model="estado" etiqueta="Estado" :opciones="OPCIONES_DE_ESTADO" class="max-w-xs" />

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio v-else-if="!cheques.length" :icono="Inbox" titulo="No hay cheques con ese filtro" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="registro in cheques" :key="registro.id">
        <TarjetaDeCheque
          :registro="registro"
          @anular="anulacion.abrir(registro)"
          @blanquear="blanqueo.abrir(registro)"
        />
      </li>
    </ul>

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
