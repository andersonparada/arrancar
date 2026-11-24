<script setup lang="ts">
import { CheckCircle2, Link2, TriangleAlert } from 'lucide-vue-next';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import TarjetaDeRol from '../componentes/TarjetaDeRol.vue';
import { usarEnlaces } from '../composables/usar-enlaces';
import { VENTANAS_CONTABILIDAD } from '../textos';

const sesion = usarSesion();
const puedeVerCuentas = sesion.puede('contabilidad.cuentas.ver');
const e = usarEnlaces(puedeVerCuentas);
const permisosDeExcel = { importar: 'contabilidad.enlaces.importar', exportar: 'contabilidad.enlaces.exportar' };
</script>

<template>
  <div>
    <EncabezadoPagina
      :titulo="VENTANAS_CONTABILIDAD.enlaces.titulo"
      :descripcion="VENTANAS_CONTABILIDAD.enlaces.descripcion"
    >
      <AccionesDeIntercambio
        :permisos="permisosDeExcel"
        @exportar="e.intercambio.exportar"
        @importar="e.intercambio.abrir"
      />
    </EncabezadoPagina>

    <template v-if="!e.cargando.value">
      <p
        class="mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
        :class="
          e.faltantes.value
            ? 'bg-trigo-300/30 text-tierra-900 dark:bg-trigo-500/20 dark:text-trigo-300'
            : 'bg-campo-100 text-campo-900 dark:bg-campo-900 dark:text-campo-100'
        "
        role="status"
      >
        <component :is="e.faltantes.value ? TriangleAlert : CheckCircle2" class="size-4 shrink-0" aria-hidden="true" />
        <span v-if="e.faltantes.value">
          Faltan {{ e.faltantes.value }} {{ e.faltantes.value === 1 ? 'cuenta por elegir' : 'cuentas por elegir' }}: los
          hechos que dependen de ellas no se podrán contabilizar.
        </span>
        <span v-else>Todos los roles tienen su cuenta.</span>
      </p>
      <p v-if="!puedeVerCuentas" class="mb-4 text-sm text-tierra-600 dark:text-tierra-300">
        Para elegir cuentas necesita el permiso de ver la nomenclatura.
      </p>
      <CampoInterruptor v-model="e.soloFaltantes.value" etiqueta="Mostrar solo lo que falta" class="mb-4 max-w-sm" />

      <EstadoVacio
        v-if="e.grupos.value.length === 0"
        :icono="Link2"
        :titulo="e.soloFaltantes.value ? 'No falta nada' : 'Sin roles que enlazar'"
        :descripcion="
          e.soloFaltantes.value
            ? 'Todos los roles tienen su cuenta.'
            : 'Los roles aparecen cuando la empresa tiene activos módulos que contabilizan (Libro de compras, Bancos…).'
        "
      />
      <section
        v-for="grupo in e.grupos.value"
        :key="grupo.clave"
        class="mb-6"
        :aria-labelledby="`grupo-${grupo.clave}`"
      >
        <h2 :id="`grupo-${grupo.clave}`" class="mb-3 text-lg font-semibold">{{ grupo.nombre }}</h2>
        <div class="space-y-3">
          <TarjetaDeRol
            v-for="rol in grupo.roles"
            :key="rol.rol"
            :rol="rol"
            :llaves="e.datos.value.llaves[rol.rol] ?? null"
            :cuentas="e.cuentas.value"
            :puede-editar="sesion.puede('contabilidad.enlaces.editar')"
            :ocupadas="e.ocupadas.value"
            @elegir="(fila, cuentaId) => e.elegir(rol, fila, cuentaId)"
            @quitar="(fila) => e.quitar(rol, fila)"
          />
        </div>
      </section>
    </template>

    <VentanaDeImportacion
      :estado="e.intercambio.estado"
      titulo="Importar enlaces contables"
      @elegir="e.intercambio.elegir"
      @plantilla="e.intercambio.bajarPlantilla"
      @importar="e.intercambio.importar"
      @cerrar="e.intercambio.cerrar"
    />
  </div>
</template>
