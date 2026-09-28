<script setup lang="ts">
import { Inbox } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import VentanaDeAnulacion from '../componentes/VentanaDeAnulacion.vue';
import TarjetaDeConciliacion from '../componentes/conciliaciones/TarjetaDeConciliacion.vue';
import VentanaDeInicioDeConciliacion from '../componentes/conciliaciones/VentanaDeInicioDeConciliacion.vue';
import { usarEliminacionDeConciliacion } from '../composables/conciliaciones/usar-eliminacion-de-conciliacion';
import { usarInicioDeConciliacion } from '../composables/conciliaciones/usar-inicio-de-conciliacion';
import { usarListaDeConciliaciones } from '../composables/conciliaciones/usar-lista-de-conciliaciones';
import { usarOpcionesDeCuenta } from '../composables/conciliaciones/usar-opciones-de-cuenta';

const { cuentasBancarias, opciones } = usarOpcionesDeCuenta();
const cuentaBancariaId = ref<string | null>(null);
const { conciliaciones, cargando, cargar } = usarListaDeConciliaciones(cuentaBancariaId);

const {
  abierta,
  anio,
  mes,
  saldoSegunBanco,
  enviando,
  errores,
  abrir: abrirInicio,
  cerrar: cerrarInicio,
  confirmar: confirmarInicio,
} = usarInicioDeConciliacion(() => cuentaBancariaId.value, cargar);
const {
  conciliacionId: conciliacionAEliminar,
  motivo,
  enviando: eliminando,
  errores: erroresDeEliminar,
  abrir: abrirEliminar,
  cerrar: cerrarEliminar,
  confirmar: confirmarEliminar,
} = usarEliminacionDeConciliacion(cargar);
const ultimaId = computed(() => conciliaciones.value[0]?.id ?? null);
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina
      titulo="Conciliaciones"
      descripcion="Conciliación mensual de cada cuenta con su estado de cuenta."
    >
      <BotonBase
        v-if="cuentaBancariaId"
        v-permiso="'bancos.conciliaciones.conciliar'"
        @click="abrirInicio(conciliaciones[0] ?? null)"
      >
        Nueva conciliación
      </BotonBase>
    </EncabezadoPagina>

    <CampoSelector
      v-model="cuentaBancariaId"
      etiqueta="Cuenta bancaria"
      :opciones="opciones"
      class="max-w-sm"
      :ayuda="!cuentasBancarias.length ? 'Todavía no hay cuentas bancarias.' : undefined"
    />

    <template v-if="cuentaBancariaId">
      <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
      <EstadoVacio
        v-else-if="!conciliaciones.length"
        :icono="Inbox"
        titulo="Esta cuenta todavía no tiene conciliaciones"
      />
      <ul v-else class="grid gap-3 md:grid-cols-2">
        <li v-for="registro in conciliaciones" :key="registro.id">
          <TarjetaDeConciliacion
            :registro="registro"
            :es-ultima="registro.id === ultimaId"
            @eliminar="abrirEliminar(registro.id)"
          />
        </li>
      </ul>
    </template>

    <VentanaDeInicioDeConciliacion
      v-model:anio="anio"
      v-model:mes="mes"
      v-model:saldo-segun-banco="saldoSegunBanco"
      :abierta="abierta"
      :enviando="enviando"
      :errores="errores"
      @cerrar="cerrarInicio"
      @iniciar="confirmarInicio"
    />
    <VentanaDeAnulacion
      v-model:motivo="motivo"
      :abierta="!!conciliacionAEliminar"
      titulo="Eliminar conciliación"
      texto="Solo se elimina la última: el mes vuelve a estar abierto. Esta acción no se puede deshacer."
      :errores="erroresDeEliminar"
      :enviando="eliminando"
      @cerrar="cerrarEliminar"
      @anular="confirmarEliminar"
    />
  </div>
</template>
