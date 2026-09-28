<script setup lang="ts">
import { Inbox } from 'lucide-vue-next';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import VentanaDeAnulacion from '../componentes/VentanaDeAnulacion.vue';
import TarjetaDeCheque from '../componentes/cheques/TarjetaDeCheque.vue';
import { usarAnulacionDeCheque } from '../composables/cheques/usar-anulacion-de-cheque';
import { usarListaDeCheques } from '../composables/cheques/usar-lista-de-cheques';

const props = defineProps<{ chequeraId: string }>();
const { cheques, cargando, cargar, estado } = usarListaDeCheques(props.chequeraId);
const { registro: chequeAAnular, motivo, enviando, errores, abrir, cerrar, confirmar } = usarAnulacionDeCheque(cargar);

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
        <TarjetaDeCheque :registro="registro" @anular="abrir(registro)" />
      </li>
    </ul>

    <VentanaDeAnulacion
      v-model:motivo="motivo"
      :abierta="!!chequeAAnular"
      titulo="Anular cheque"
      :texto="`¿Anular el cheque No. ${chequeAAnular?.numero ?? ''}? Esta acción no se puede deshacer.`"
      :errores="errores"
      :enviando="enviando"
      @cerrar="cerrar"
      @anular="confirmar"
    />
  </div>
</template>
