<script setup lang="ts">
import { Mail, MessageCircle, Phone } from 'lucide-vue-next';
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearTelefono } from '@/modulos/core/utilidades/formato';
import type { ContactoEncontrado } from '../servicios/terceros.api';

defineProps<{ encontrado: ContactoEncontrado; ficha: RouteLocationRaw }>();

/** WhatsApp pide el número con código de país; los de 8 dígitos son de Guatemala. */
const enlaceDeWhatsapp = (numero: string) =>
  `https://wa.me/${numero.length === 8 ? `502${numero}` : numero.replace('+', '')}`;
</script>

<template>
  <TarjetaBase class="flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-2">
      <RouterLink :to="ficha" class="font-semibold hover:underline">{{ encontrado.terceroNombre }}</RouterLink>
      <InsigniaBase v-if="encontrado.esCliente" tono="campo">Cliente</InsigniaBase>
      <InsigniaBase v-if="encontrado.esProveedor" tono="trigo">Proveedor</InsigniaBase>
    </div>
    <p v-if="encontrado.contactoNombre" class="text-sm">
      {{ encontrado.contactoNombre
      }}<span v-if="encontrado.cargo" class="text-tierra-500"> · {{ encontrado.cargo }}</span>
    </p>
    <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <a
        v-if="encontrado.telefono"
        :href="`tel:${encontrado.telefono}`"
        class="flex items-center gap-1.5 text-campo-700 hover:underline dark:text-campo-300"
      >
        <Phone class="size-4" aria-hidden="true" />{{ formatearTelefono(encontrado.telefono) }}
      </a>
      <a
        v-if="encontrado.whatsapp"
        :href="enlaceDeWhatsapp(encontrado.whatsapp)"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-1.5 text-campo-700 hover:underline dark:text-campo-300"
      >
        <MessageCircle class="size-4" aria-hidden="true" />{{ formatearTelefono(encontrado.whatsapp) }}
      </a>
      <a
        v-if="encontrado.correo"
        :href="`mailto:${encontrado.correo}`"
        class="flex items-center gap-1.5 text-campo-700 hover:underline dark:text-campo-300"
      >
        <Mail class="size-4" aria-hidden="true" />{{ encontrado.correo }}
      </a>
      <span v-if="!encontrado.telefono && !encontrado.whatsapp && !encontrado.correo" class="text-tierra-500">
        Sin teléfono ni correo registrados
      </span>
    </div>
  </TarjetaBase>
</template>
