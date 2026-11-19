<script setup lang="ts">
import { ref } from 'vue';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EtiquetasDeActivo from '../componentes/activos/EtiquetasDeActivo.vue';
import HistorialDeUbicacion from '../componentes/activos/HistorialDeUbicacion.vue';
import PestanasDeFicha from '../componentes/activos/PestanasDeFicha.vue';
import VentanaDeMotivo from '../componentes/comunes/VentanaDeMotivo.vue';
import PanelDeCostos from '../componentes/costos/PanelDeCostos.vue';
import VentanaDeCosto from '../componentes/costos/VentanaDeCosto.vue';
import { usarFichaDeActivo } from '../composables/activos/usar-ficha-de-activo';
import { usarAnulacionDeCosto } from '../composables/costos/usar-anulacion-de-costo';
import { usarCostosDeActivo } from '../composables/costos/usar-costos-de-activo';
import { VENTANAS_ACTIVOS_FIJOS } from '../textos';

const props = defineProps<{ activoId: string }>();

const ventana = VENTANAS_ACTIVOS_FIJOS.activos;
const { registro, cargando, cargar, detalles, etiquetas } = usarFichaDeActivo(props.activoId);
const costos = usarCostosDeActivo(props.activoId, () => registro.value?.incisoFiscal === 'edificios', cargar);
const anulacion = usarAnulacionDeCosto(() => costos.datos.value.total, costos.anular);
const volver = { texto: `Volver a ${ventana.titulo}`, ruta: { name: 'activos-fijos.activos' } };
const pestanas = [
  { clave: 'datos', texto: 'Datos' },
  { clave: 'costos', texto: 'Costos' },
];
const pestana = ref('datos');
</script>

<template>
  <div v-if="registro" class="space-y-4">
    <EncabezadoPagina
      :titulo="`${registro.codigo} · ${registro.descripcion}`"
      :descripcion="ventana.ficha"
      :volver="volver"
    >
      <EtiquetasDeActivo :etiquetas="etiquetas" />
    </EncabezadoPagina>

    <PestanasDeFicha v-model="pestana" :pestanas="pestanas" />
    <div id="panel-de-la-ficha" role="tabpanel" class="space-y-4">
      <template v-if="pestana === 'datos'">
        <DatosDelRegistro :detalles="detalles" />
        <HistorialDeUbicacion :traslados="registro.traslados" />
      </template>
      <PanelDeCostos
        v-else
        :costos="costos.datos.value.costos"
        :total="costos.datos.value.total"
        :cargando="costos.cargando.value"
        @registrar="costos.abrir"
        @anular="anulacion.pedir"
      />
    </div>

    <VentanaDeCosto
      v-model="costos.edicion.value"
      :abierta="costos.ventanaAbierta.value"
      :errores="costos.errores.value"
      :enviando="costos.enviando.value"
      :es-edificio="registro.incisoFiscal === 'edificios'"
      @cerrar="costos.ventanaAbierta.value = false"
      @guardar="costos.registrar"
    />
    <VentanaDeMotivo
      v-model:motivo="anulacion.motivo.value"
      :abierta="anulacion.costo.value !== null"
      titulo="Anular costo"
      :texto="anulacion.texto.value"
      accion="Anular costo"
      :errores="costos.errores.value"
      :enviando="costos.enviando.value"
      @cerrar="anulacion.cerrar"
      @confirmar="anulacion.confirmar"
    />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
</template>
