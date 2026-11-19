<script setup lang="ts">
import { computed } from 'vue';
import { CloudDownload, Coins, Plus } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import BotonBase from '../componentes/BotonBase.vue';
import CampoSelector from '../componentes/CampoSelector.vue';
import EncabezadoPagina from '../componentes/EncabezadoPagina.vue';
import EstadoVacio from '../componentes/EstadoVacio.vue';
import BitacoraDeLaCarga from '../componentes/plataforma/BitacoraDeLaCarga.vue';
import CalendarioDeTipos from '../componentes/plataforma/CalendarioDeTipos.vue';
import EstadoDeLasSeries from '../componentes/plataforma/EstadoDeLasSeries.vue';
import VentanaDeCargaManual from '../componentes/plataforma/VentanaDeCargaManual.vue';
import VentanaDeTipoManual from '../componentes/plataforma/VentanaDeTipoManual.vue';
import { NOTA_DE_LA_POLITICA_DE_CRUCES } from '../composables/plataforma/convenciones-del-banguat';
import { usarCargaManual } from '../composables/plataforma/usar-carga-manual';
import { usarTipoManual } from '../composables/plataforma/usar-tipo-manual';
import { usarTiposDeCambioDePlataforma } from '../composables/plataforma/usar-tipos-de-cambio-de-plataforma';
import { VENTANAS_CORE } from '../textos';

const pantalla = usarTiposDeCambioDePlataforma();
const { moneda, hoy, estado, soloDeLaMoneda, mes, cargando } = pantalla;
const tipo = usarTipoManual(
  () => moneda.value,
  () => hoy.value,
  pantalla.recargar,
);
const cargaManual = usarCargaManual(() => hoy.value, pantalla.recargar);
const opciones = computed(() =>
  pantalla.opcionesDeMoneda.value.map((m) => ({ valor: m.codigo, texto: `${m.nombre} (${m.codigo})` })),
);
const monedasQueSeCargan = computed(() => estado.value.series.filter((s) => s.activa).map((s) => s.moneda));
</script>

<template>
  <div>
    <EncabezadoPagina
      :titulo="VENTANAS_CORE.tiposDeCambio.titulo"
      :descripcion="VENTANAS_CORE.tiposDeCambio.descripcion"
    >
      <span v-permiso="'configuracion.tipos-de-cambio.crear'" class="contents">
        <BotonBase variante="secundario" :icono="CloudDownload" @click="cargaManual.abrir">Cargar ahora</BotonBase>
        <BotonBase :icono="Plus" :deshabilitado="!moneda" @click="tipo.abrirNuevo">Ingresar tipo</BotonBase>
      </span>
    </EncabezadoPagina>

    <section class="mb-6" aria-labelledby="titulo-estado">
      <h2 id="titulo-estado" class="mb-2 text-lg font-semibold">Estado de la carga</h2>
      <EstadoDeLasSeries :series="estado.series" />
    </section>

    <EstadoVacio
      v-if="!cargando && !opciones.length"
      :icono="Coins"
      titulo="Ninguna moneda tiene tipo de cambio"
      descripcion="Active una moneda extranjera y únale su código del Banguat para ver su calendario."
    >
      <RouterLink to="/plataforma/monedas" class="font-medium text-campo-700 underline dark:text-campo-300">
        Ir a Monedas
      </RouterLink>
    </EstadoVacio>
    <template v-else>
      <div class="mb-4 max-w-sm">
        <CampoSelector v-model="moneda" etiqueta="Moneda" :opciones="opciones" />
      </div>
      <CalendarioDeTipos
        :mes="mes.calendario"
        :nombre="mes.nombre"
        :moneda="moneda"
        :puede-avanzar="mes.puedeAvanzar"
        @mover="mes.mover"
        @elegir="tipo.abrirDelDia"
      />
      <p v-if="moneda && moneda !== 'USD'" class="mt-2 text-xs text-tierra-600 dark:text-tierra-300">
        {{ NOTA_DE_LA_POLITICA_DE_CRUCES }}
      </p>
    </template>

    <section class="mt-8" aria-labelledby="titulo-bitacora">
      <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 id="titulo-bitacora" class="text-lg font-semibold">Bitácora de la carga</h2>
        <label v-if="moneda" class="flex items-center gap-2 text-sm">
          <input v-model="soloDeLaMoneda" type="checkbox" class="size-4 accent-campo-700" />
          Solo de {{ moneda }}
        </label>
      </div>
      <BitacoraDeLaCarga :consultas="estado.consultas" />
    </section>

    <VentanaDeTipoManual
      v-model="tipo.formulario.value"
      :errores="tipo.errores.value"
      :enviando="tipo.enviando.value"
      :cargando-versiones="tipo.cargandoVersiones.value"
      @cerrar="tipo.cerrar"
      @guardar="tipo.guardar"
    />
    <VentanaDeCargaManual
      v-model="cargaManual.carga"
      :monedas="monedasQueSeCargan"
      :errores="cargaManual.errores.value"
      :enviando="cargaManual.enviando.value"
      @cerrar="cargaManual.cerrar"
      @cargar="cargaManual.cargar"
    />
  </div>
</template>
