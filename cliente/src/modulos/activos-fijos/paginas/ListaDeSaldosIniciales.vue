<script setup lang="ts">
import { computed } from 'vue';
import { Info, Plus, Scale } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import ResumenDeCarga from '../componentes/saldos-iniciales/ResumenDeCarga.vue';
import TarjetaDeSaldoInicial from '../componentes/saldos-iniciales/TarjetaDeSaldoInicial.vue';
import { usarSaldosIniciales } from '../composables/saldos-iniciales/usar-saldos-iniciales';
import { VENTANAS_ACTIVOS_FIJOS } from '../textos';

const router = useRouter();
const ventana = VENTANAS_ACTIVOS_FIJOS.saldosIniciales;
const { lista, cargando, bloqueo, intercambio, eliminar } = usarSaldosIniciales();
const permisos = computed(() => ({
  exportar: 'activos-fijos.saldos-iniciales.exportar',
  importar: bloqueo.value ? undefined : 'activos-fijos.saldos-iniciales.importar',
}));
const editar = (activoId: string) =>
  router.push({ name: 'activos-fijos.saldos-iniciales.editar', params: { activoId } });
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <AccionesDeIntercambio :permisos="permisos" @exportar="intercambio.exportar" @importar="intercambio.abrir" />
      <BotonBase
        v-if="!bloqueo"
        v-permiso="'activos-fijos.saldos-iniciales.crear'"
        :icono="Plus"
        @click="router.push({ name: 'activos-fijos.saldos-iniciales.nuevo' })"
      >
        {{ ventana.nuevo }}
      </BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <template v-else>
      <p
        v-if="bloqueo"
        role="status"
        class="flex gap-2 rounded-lg border border-trigo-500/50 bg-trigo-300/20 p-3 text-sm dark:bg-trigo-500/10"
      >
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {{ bloqueo }}
      </p>
      <ResumenDeCarga v-if="lista.saldos.length" :lista="lista" />
      <EstadoVacio
        v-if="!lista.saldos.length"
        :icono="Scale"
        titulo="Todavía no hay saldos iniciales de activos"
        descripcion="Si la empresa ya tenía activos a la fecha de inicio, cárguelos uno por uno o importe el Excel con todos. Si no tenía, no hace falta cargar nada."
      />
      <ul v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <li v-for="saldo in lista.saldos" :key="saldo.activoId">
          <TarjetaDeSaldoInicial
            :registro="saldo"
            :editable="!lista.cargaCerrada"
            @editar="editar(saldo.activoId)"
            @eliminar="eliminar(saldo)"
          />
        </li>
      </ul>
    </template>

    <VentanaDeImportacion
      :estado="intercambio.estado"
      titulo="Importar saldos iniciales de activos"
      @elegir="intercambio.elegir"
      @plantilla="intercambio.bajarPlantilla"
      @importar="intercambio.importar"
      @cerrar="intercambio.cerrar"
    />
  </div>
</template>
