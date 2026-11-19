<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import {
  esDeTerceros,
  OPCIONES_DE_ORIGEN,
  OPCIONES_DE_TENENCIA,
  OPCIONES_DE_TIPO,
  type EdicionDeActivo,
} from '../../composables/activos/edicion-de-activo';
import type { Clase } from '../../servicios/clases.api';

/** Los campos del alta de un activo; así se ve igual donde se use. */
defineProps<{
  errores: Record<string, string>;
  referencias: Record<'claseId' | 'localidadId' | 'departamentoId' | 'activoPadreId', OpcionDeRegistro[]>;
  inciso: Clase['incisoFiscal'] | null;
}>();
const edicion = defineModel<EdicionDeActivo>({ required: true });
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-4">
      <h2 class="text-sm font-semibold text-tierra-600 dark:text-tierra-300">¿Qué es?</h2>
      <CampoSelector
        v-model="edicion.tipoDeRegistro"
        etiqueta="Tipo de registro"
        :opciones="opcionesDeLista(OPCIONES_DE_TIPO, false)"
        requerido
        :error="errores.tipoDeRegistro"
      />
      <CampoTexto
        v-model="edicion.descripcion"
        etiqueta="Descripción"
        requerido
        :longitud-maxima="200"
        :error="errores.descripcion"
      />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto
          v-model="edicion.codigo"
          etiqueta="Código"
          sin-correccion
          :longitud-maxima="30"
          ayuda="Si lo deja vacío, se propone el siguiente."
          :error="errores.codigo"
        />
        <CampoSelector
          v-model="edicion.claseId"
          etiqueta="Clase"
          :opciones="referencias.claseId"
          requerido
          :error="errores.claseId"
        />
      </div>
      <CampoSelector
        v-model="edicion.activoPadreId"
        etiqueta="Es componente de"
        :opciones="referencias.activoPadreId"
        :error="errores.activoPadreId"
      />
    </section>

    <section class="space-y-4">
      <h2 class="text-sm font-semibold text-tierra-600 dark:text-tierra-300">Procedencia</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto
          v-model="edicion.fechaDeAdquisicion"
          etiqueta="Fecha de adquisición"
          tipo="date"
          requerido
          :error="errores.fechaDeAdquisicion"
        />
        <CampoSelector
          v-if="!esDeTerceros(edicion)"
          v-model="edicion.origen"
          etiqueta="Origen"
          :opciones="opcionesDeLista(OPCIONES_DE_ORIGEN, false)"
          requerido
          :error="errores.origen"
        />
        <template v-else>
          <CampoTexto
            v-model="edicion.propietario"
            etiqueta="Propietario"
            requerido
            :longitud-maxima="150"
            :error="errores.propietario"
          />
          <CampoSelector
            v-model="edicion.formaDeTenencia"
            etiqueta="Forma de tenencia"
            :opciones="opcionesDeLista(OPCIONES_DE_TENENCIA, false)"
            requerido
            :error="errores.formaDeTenencia"
          />
        </template>
      </div>
      <div v-if="inciso === 'edificios'" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto
          v-model="edicion.valorDeMatricula"
          etiqueta="Valor de matrícula fiscal"
          tipo="number"
          paso="any"
          :error="errores.valorDeMatricula"
        />
        <CampoTexto
          v-model="edicion.valorCatastral"
          etiqueta="Valor catastral municipal"
          tipo="number"
          paso="any"
          :error="errores.valorCatastral"
        />
        <CampoInterruptor
          v-model="edicion.valoresDelInmuebleCompleto"
          etiqueta="Los valores son del inmueble completo"
          descripcion="Si no separan el terreno del edificio, el tope es el 70 % del mayor."
        />
      </div>
      <CampoTexto
        v-if="inciso === 'reproductores'"
        v-model="edicion.valorComoGanadoComun"
        etiqueta="Valor como ganado común"
        tipo="number"
        paso="any"
        requerido
        :error="errores.valorComoGanadoComun"
      />
    </section>

    <section class="space-y-4">
      <h2 class="text-sm font-semibold text-tierra-600 dark:text-tierra-300">Ubicación</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoSelector
          v-model="edicion.localidadId"
          etiqueta="Localidad"
          :opciones="referencias.localidadId"
          :error="errores.localidadId"
        />
        <CampoSelector
          v-model="edicion.departamentoId"
          etiqueta="Departamento"
          :opciones="referencias.departamentoId"
          :error="errores.departamentoId"
        />
      </div>
      <CampoTexto
        v-model="edicion.responsable"
        etiqueta="Responsable"
        :longitud-maxima="150"
        :error="errores.responsable"
      />
      <CampoInterruptor
        v-model="edicion.enBodega"
        etiqueta="En bodega de activos"
        descripcion="Guardado en su localidad, listo pero sin entregar a nadie."
      />
    </section>

    <section class="space-y-4">
      <h2 class="text-sm font-semibold text-tierra-600 dark:text-tierra-300">El bien</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto v-model="edicion.marca" etiqueta="Marca" :longitud-maxima="80" :error="errores.marca" />
        <CampoTexto v-model="edicion.modelo" etiqueta="Modelo" :longitud-maxima="80" :error="errores.modelo" />
        <CampoTexto
          v-model="edicion.numeroDeSerie"
          etiqueta="Número de serie"
          sin-correccion
          :longitud-maxima="80"
          :error="errores.numeroDeSerie"
        />
        <CampoTexto
          v-model="edicion.placa"
          etiqueta="Placa"
          sin-correccion
          :longitud-maxima="80"
          :error="errores.placa"
        />
        <CampoTexto v-model="edicion.cantidad" etiqueta="Cantidad" tipo="number" requerido :error="errores.cantidad" />
      </div>
      <CampoTexto
        v-model="edicion.observaciones"
        etiqueta="Observaciones"
        multilinea
        :longitud-maxima="500"
        :error="errores.observaciones"
      />
    </section>
  </div>
</template>
