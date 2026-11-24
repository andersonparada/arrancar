<script setup lang="ts">
import { computed } from 'vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { anchosDeMascara, ejemploDeCodigo } from '../composables/edicion-de-cuenta';
import { AYUDA_DEL_CASO, CASOS_DE_INICIO, type FormularioDeInicio } from '../composables/edicion-de-inicio';

/**
 * Fecha, caso, máscara y firmantes. Con la contabilidad ya iniciada y cuentas creadas la máscara queda fija; sin
 * permiso de edición todo se ve y nada se cambia.
 */
const props = defineProps<{
  puedeEditar: boolean;
  mascaraFija: boolean;
  avisoDeMascara: string | null;
  avisoDelContador: string | null;
  errores: Record<string, string>;
}>();
const datos = defineModel<FormularioDeInicio>({ required: true });

const ayudaDeMascara = computed(() => {
  if (props.mascaraFija) return 'Ya hay cuentas: la máscara no se cambia.';
  const niveles = anchosDeMascara(datos.value.mascara).length;
  return niveles ? `${niveles} niveles; un código se vería así: ${ejemploDeCodigo(datos.value.mascara)}.` : undefined;
});
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-4" aria-labelledby="titulo-inicio">
      <h2 id="titulo-inicio" class="font-semibold">Desde cuándo</h2>
      <CampoSelector
        v-model="datos.caso"
        etiqueta="La contabilidad empieza"
        requerido
        :opciones="CASOS_DE_INICIO"
        :deshabilitado="!puedeEditar"
        :error="errores.caso"
      />
      <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ AYUDA_DEL_CASO[datos.caso] }}</p>
      <CampoTexto
        v-model="datos.fecha"
        tipo="date"
        etiqueta="Fecha de inicio"
        requerido
        :solo-lectura="!puedeEditar"
        :error="errores.fecha"
      />
    </section>

    <section class="space-y-4" aria-labelledby="titulo-mascara">
      <h2 id="titulo-mascara" class="font-semibold">Códigos de cuenta</h2>
      <CampoTexto
        v-model="datos.mascara"
        etiqueta="Máscara"
        requerido
        sin-correccion
        :solo-lectura="!puedeEditar || mascaraFija"
        :ayuda="ayudaDeMascara"
        :error="errores.mascara ?? avisoDeMascara ?? undefined"
      />
    </section>

    <section class="space-y-4" aria-labelledby="titulo-firmas">
      <h2 id="titulo-firmas" class="font-semibold">Quién firma</h2>
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        Salen al pie de los estados financieros y del Libro de Inventarios. Sin estos datos, las líneas de firma quedan
        en blanco. Se pueden cambiar cuando quiera: cada impresión conserva los nombres que tenía.
      </p>
      <CampoTexto
        v-model="datos.firmaRepresentante"
        etiqueta="Propietario o representante legal"
        :longitud-maxima="150"
        :solo-lectura="!puedeEditar"
        :error="errores.firmaRepresentante"
      />
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="sm:col-span-2">
          <CampoTexto
            v-model="datos.firmaContador"
            etiqueta="Contador"
            :longitud-maxima="150"
            :solo-lectura="!puedeEditar"
            :error="errores.firmaContador"
          />
        </div>
        <CampoTexto
          v-model="datos.registroDelContador"
          etiqueta="Registro del contador"
          :longitud-maxima="30"
          :solo-lectura="!puedeEditar"
          :error="errores.registroDelContador ?? avisoDelContador ?? undefined"
        />
      </div>
    </section>
  </div>
</template>
