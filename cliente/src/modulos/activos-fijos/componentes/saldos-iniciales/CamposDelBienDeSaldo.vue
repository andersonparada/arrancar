<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { EdicionDeSaldoInicial } from '../../composables/saldos-iniciales/edicion-de-saldo-inicial';
import type { Clase } from '../../servicios/clases.api';

/** Qué es el activo, cuándo se compró y se puso en uso, dónde está y sus datos de identificación. */
defineProps<{
  errores: Record<string, string>;
  referencias: Record<'claseId' | 'localidadId' | 'departamentoId' | 'activoPadreId', OpcionDeRegistro[]>;
  inciso: Clase['incisoFiscal'] | null;
}>();
const edicion = defineModel<EdicionDeSaldoInicial>({ required: true });
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-4">
      <h2 class="text-sm font-semibold text-tierra-600 dark:text-tierra-300">¿Qué es?</h2>
      <CampoTexto
        v-model="edicion.descripcion"
        etiqueta="Descripción"
        requerido
        :longitud-maxima="200"
        :error="errores.descripcion"
      />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoSelector
          v-model="edicion.claseId"
          etiqueta="Clase"
          :opciones="referencias.claseId"
          requerido
          :error="errores.claseId"
        />
        <CampoTexto
          v-model="edicion.codigo"
          etiqueta="Código"
          sin-correccion
          :longitud-maxima="30"
          ayuda="Si lo deja vacío, se propone el siguiente."
          :error="errores.codigo"
        />
        <CampoSelector
          v-model="edicion.activoPadreId"
          etiqueta="Es componente de"
          :opciones="referencias.activoPadreId"
          :error="errores.activoPadreId"
        />
        <CampoTexto v-model="edicion.cantidad" etiqueta="Cantidad" tipo="number" requerido :error="errores.cantidad" />
      </div>
    </section>

    <section class="space-y-4">
      <h2 class="text-sm font-semibold text-tierra-600 dark:text-tierra-300">Fechas</h2>
      <CampoInterruptor
        v-model="edicion.enConstruccion"
        etiqueta="Es una obra que todavía no se termina"
        descripcion="Entra al balance sin depreciar; se pone en uso cuando se termine."
      />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto
          v-model="edicion.fechaDeAdquisicion"
          etiqueta="Fecha de adquisición"
          tipo="date"
          requerido
          ayuda="La fecha real de compra, anterior a la fecha de inicio de la empresa."
          :error="errores.fechaDeAdquisicion"
        />
        <CampoTexto
          v-if="!edicion.enConstruccion"
          v-model="edicion.fechaDeInicioDeUso"
          etiqueta="Fecha de inicio de uso"
          tipo="date"
          requerido
          :error="errores.fechaDeInicioDeUso"
        />
      </div>
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
