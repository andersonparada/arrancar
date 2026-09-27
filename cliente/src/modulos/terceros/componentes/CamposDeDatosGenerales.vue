<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { Departamento, Municipio } from '@/modulos/core/servicios/geografia.api';
import type { DatosTercero } from '../servicios/terceros.api';

defineProps<{ departamentos: Departamento[]; municipios: Municipio[]; errores: Record<string, string> }>();
const datos = defineModel<DatosTercero>({ required: true });

const TIPOS = [
  { valor: 'individual' as const, texto: 'Persona individual' },
  { valor: 'juridica' as const, texto: 'Persona jurídica (empresa)' },
];
const SIN_REGISTRAR = { valor: null, texto: 'Sin registrar' };
</script>

<template>
  <div class="space-y-4">
    <CampoSelector v-model="datos.tipo" etiqueta="Tipo" :opciones="TIPOS" />
    <div v-if="datos.tipo === 'individual'" class="grid gap-4 sm:grid-cols-2">
      <CampoTexto v-model="datos.nombres" etiqueta="Nombres" requerido :error="errores.nombres" />
      <CampoTexto v-model="datos.apellidos" etiqueta="Apellidos" :error="errores.apellidos" />
    </div>
    <CampoTexto v-else v-model="datos.razonSocial" etiqueta="Razón social" requerido :error="errores.razonSocial" />
    <CampoTexto v-model="datos.nombreComercial" etiqueta="Nombre comercial" :error="errores.nombreComercial" />
    <div class="grid gap-4 sm:grid-cols-2">
      <CampoTexto v-model="datos.nit" etiqueta="NIT" placeholder="CF si no tiene" :error="errores.nit" />
      <CampoTexto v-model="datos.dpi" etiqueta="DPI" :error="errores.dpi" />
      <CampoTexto v-model="datos.telefono" etiqueta="Teléfono" tipo="tel" :error="errores.telefono" />
      <CampoTexto v-model="datos.whatsapp" etiqueta="WhatsApp" tipo="tel" :error="errores.whatsapp" />
    </div>
    <CampoTexto v-model="datos.correo" etiqueta="Correo" tipo="email" :error="errores.correo" />
    <div class="grid gap-4 sm:grid-cols-2">
      <CampoSelector
        v-model="datos.departamentoCodigo"
        etiqueta="Departamento"
        :opciones="[SIN_REGISTRAR, ...departamentos.map((d) => ({ valor: d.codigo, texto: d.nombre }))]"
      />
      <CampoSelector
        v-model="datos.municipioCodigo"
        etiqueta="Municipio"
        :opciones="[SIN_REGISTRAR, ...municipios.map((m) => ({ valor: m.codigo, texto: m.nombre }))]"
      />
    </div>
    <CampoTexto v-model="datos.direccion" etiqueta="Dirección" :error="errores.direccion" />
    <CampoTexto v-model="datos.notas" etiqueta="Notas" multilinea :error="errores.notas" />
    <CampoInterruptor
      v-model="datos.activo"
      etiqueta="Activo"
      descripcion="Al inactivarlo, se inactivan también sus papeles."
    />
  </div>
</template>
