<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { EdicionDeMedicion } from '../../composables/mediciones/edicion-de-medicion';
import { OPCIONES_DE_TENENCIA, type EdicionDeParcela } from '../../composables/parcelas/edicion-de-parcela';
import type { AjustesDeSuperficie } from '../../composables/superficie/unidades-de-superficie';
import CamposDeMedicion from '../superficie/CamposDeMedicion.vue';
import CamposDelTerreno from './CamposDelTerreno.vue';
import EditorDeInmuebles from './EditorDeInmuebles.vue';

/**
 * Los campos de la parcela; los usan el alta y la edición, así se ven igual. Al crear se elige la localidad y la madre
 * y se puede registrar la primera medición; al editar, la localidad, la madre y el código quedan fijos (para
 * reorganizar se inactiva la parcela y se crea otra).
 */
defineProps<{
  errores: Record<string, string>;
  erroresDeMedicion: Record<string, string>;
  referencias: Record<'localidadId' | 'tipoId' | 'parcelaMadreId' | 'inmuebleId', OpcionDeRegistro[]>;
  ajustes: AjustesDeSuperficie;
  /** Al editar: cómo se llaman la localidad y la madre, que no se cambian. */
  ubicacion: { localidadNombre: string; madreCodigo: string | null };
}>();
const edicion = defineModel<EdicionDeParcela>({ required: true });
const medicion = defineModel<EdicionDeMedicion>('medicion', { required: true });
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-4" aria-labelledby="parcela-identidad">
      <h2 id="parcela-identidad" class="text-base font-semibold">La parcela</h2>
      <template v-if="edicion.id">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoTexto :model-value="ubicacion.localidadNombre" etiqueta="Localidad" solo-lectura />
          <CampoTexto
            :model-value="ubicacion.madreCodigo ?? 'Ninguna (primer nivel)'"
            etiqueta="Parcela madre"
            solo-lectura
          />
        </div>
        <p class="text-xs text-tierra-500">
          La localidad, la parcela madre y el código no se cambian. Para reorganizar, inactive esta parcela y registre
          otra.
        </p>
      </template>
      <template v-else>
        <CampoSelector
          v-model="edicion.localidadId"
          etiqueta="Localidad"
          :opciones="referencias.localidadId"
          requerido
          :error="errores.localidadId"
        />
        <CampoSelector
          v-model="edicion.parcelaMadreId"
          etiqueta="Parcela madre"
          :opciones="referencias.parcelaMadreId"
          :deshabilitado="!edicion.localidadId"
          :error="errores.parcelaMadreId"
        />
      </template>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CampoTexto
          v-model="edicion.codigo"
          etiqueta="Código"
          requerido
          sin-correccion
          :solo-lectura="Boolean(edicion.id)"
          :longitud-maxima="20"
          :error="errores.codigo"
        />
        <div class="sm:col-span-2">
          <CampoTexto
            v-model="edicion.nombre"
            etiqueta="Nombre"
            requerido
            :longitud-maxima="120"
            :error="errores.nombre"
          />
        </div>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoSelector
          v-model="edicion.tipoId"
          etiqueta="Tipo de parcela"
          :opciones="referencias.tipoId"
          requerido
          :error="errores.tipoId"
        />
        <CampoSelector
          v-model="edicion.formaDeTenencia"
          etiqueta="Cómo la tiene la empresa"
          :opciones="opcionesDeLista(OPCIONES_DE_TENENCIA, false)"
          requerido
          :error="errores.formaDeTenencia"
        />
      </div>
    </section>

    <section v-if="!edicion.id" class="space-y-4" aria-labelledby="parcela-medicion">
      <h2 id="parcela-medicion" class="text-base font-semibold">Superficie</h2>
      <CampoInterruptor
        v-model="edicion.conMedicion"
        etiqueta="Registrar la superficie ahora"
        descripcion="Si todavía no la conoce, déjela para después: se registra desde la ficha de la parcela."
      />
      <CamposDeMedicion v-if="edicion.conMedicion" v-model="medicion" :errores="erroresDeMedicion" :ajustes="ajustes" />
    </section>

    <section class="space-y-4" aria-labelledby="parcela-terreno">
      <h2 id="parcela-terreno" class="text-base font-semibold">Ubicación en el terreno</h2>
      <CamposDelTerreno v-model="edicion" :errores="errores" />
    </section>

    <section class="space-y-4" aria-labelledby="parcela-registro">
      <h2 id="parcela-registro" class="text-base font-semibold">Registro de la propiedad</h2>
      <EditorDeInmuebles v-model="edicion.inmuebles" :opciones="referencias.inmuebleId" :error="errores.inmuebles" />
    </section>

    <CampoTexto
      v-model="edicion.observaciones"
      etiqueta="Observaciones"
      multilinea
      :longitud-maxima="500"
      :error="errores.observaciones"
    />
  </div>
</template>
