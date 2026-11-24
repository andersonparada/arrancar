<script setup lang="ts">
import { ref } from 'vue';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import FichaNoEncontrada from '@/modulos/core/componentes/FichaNoEncontrada.vue';
import EtiquetasDeActivo from '../componentes/activos/EtiquetasDeActivo.vue';
import HistorialDeUbicacion from '../componentes/activos/HistorialDeUbicacion.vue';
import PanelDeDepreciacion from '../componentes/depreciacion/PanelDeDepreciacion.vue';
import PanelDeSaldoInicial from '../componentes/saldos-iniciales/PanelDeSaldoInicial.vue';
import AccionesDeFicha from '../componentes/activos/AccionesDeFicha.vue';
import PestanasDeFicha from '../componentes/activos/PestanasDeFicha.vue';
import VentanasDeAcciones from '../componentes/activos/VentanasDeAcciones.vue';
import PanelDeMejoras from '../componentes/mejoras/PanelDeMejoras.vue';
import VentanaDeMotivo from '../componentes/comunes/VentanaDeMotivo.vue';
import PanelDeCostos from '../componentes/costos/PanelDeCostos.vue';
import VentanaDeCosto from '../componentes/costos/VentanaDeCosto.vue';
import { usarFichaDeActivo } from '../composables/activos/usar-ficha-de-activo';
import { usarAccionesDeFicha } from '../composables/activos/usar-acciones-de-ficha';
import { usarAnulacionDeCosto } from '../composables/costos/usar-anulacion-de-costo';
import { usarCostosDeActivo } from '../composables/costos/usar-costos-de-activo';
import { usarSaldoDeFicha } from '../composables/saldos-iniciales/usar-saldo-de-ficha';
import { VENTANAS_ACTIVOS_FIJOS } from '../textos';

const props = defineProps<{ activoId: string }>();

const ventana = VENTANAS_ACTIVOS_FIJOS.activos;
const { registro, cargando, cargar, detalles, etiquetas } = usarFichaDeActivo(props.activoId);
const costos = usarCostosDeActivo(props.activoId, () => registro.value?.incisoFiscal === 'edificios', cargar);
const anulacion = usarAnulacionDeCosto(() => costos.datos.value.total, costos.anular);
const saldo = usarSaldoDeFicha(() => registro.value);
// Una mejora cambia los costos (y su total): la pestaña Costos se vuelve a traer junto con la ficha.
const cargarTodo = async () => void (await Promise.all([cargar(), costos.cargar()]));
const acciones = usarAccionesDeFicha(props.activoId, registro, cargarTodo);
const volver = { texto: `Volver a ${ventana.titulo}`, ruta: { name: 'activos-fijos.activos' } };
const pestanas = [
  { clave: 'datos', texto: 'Datos' },
  { clave: 'costos', texto: 'Costos' },
  { clave: 'mejoras', texto: 'Mejoras' },
  { clave: 'depreciacion', texto: 'Depreciación' },
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
      <AccionesDeFicha
        :dado-de-baja="registro.estado === 'dado_de_baja'"
        :es-edificio="acciones.esEdificio()"
        @trasladar="acciones.trasladar"
        @mejora="acciones.mejoras.abrir"
        @estimacion="acciones.revisiones.abrirEstimacion"
        @matricula="acciones.revisiones.abrirMatricula"
      />
    </EncabezadoPagina>

    <PestanasDeFicha v-model="pestana" :pestanas="pestanas" />
    <div id="panel-de-la-ficha" role="tabpanel" class="space-y-4">
      <template v-if="pestana === 'datos'">
        <DatosDelRegistro :detalles="detalles" />
        <PanelDeSaldoInicial v-if="saldo" :saldo="saldo" />
        <HistorialDeUbicacion :traslados="registro.traslados" @anular="acciones.anularTraslado" />
      </template>
      <PanelDeDepreciacion
        v-else-if="pestana === 'depreciacion'"
        :tramos="registro.tramos"
        :en-construccion="registro.estado === 'en_construccion'"
      />
      <PanelDeMejoras
        v-else-if="pestana === 'mejoras'"
        :mejoras="acciones.mejoras.mejoras.value"
        :cargando="acciones.mejoras.cargando.value"
        @registrar="acciones.mejoras.abrir"
        @anular="acciones.mejoras.anulacion.pedir"
      />
      <PanelDeCostos
        v-else
        :costos="costos.datos.value.costos"
        :total="costos.datos.value.total"
        :cargando="costos.cargando.value"
        @registrar="costos.abrir"
        @anular="anulacion.pedir"
      />
    </div>

    <VentanasDeAcciones
      :acciones="acciones"
      :es-edificio="acciones.esEdificio()"
      :vida-total="registro.vidaUtilContableMeses"
      :residual="registro.valorResidual"
    />
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
  <FichaNoEncontrada v-else titulo="Activo" :volver="volver" />
</template>
