<script setup lang="ts">
import { computed } from 'vue';
import { Printer } from 'lucide-vue-next';
import { useRoute } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AvisoDeTamanoReal from '../componentes/formatos-de-cheque/AvisoDeTamanoReal.vue';
import ChequeParaImpresion from '../componentes/impresion-de-cheques/ChequeParaImpresion.vue';
import { textoDeImprimir, type ParteDeLaImpresion } from '../composables/impresion-de-cheques/armado-de-la-impresion';
import { usarImpresionDeCheques } from '../composables/impresion-de-cheques/usar-impresion-de-cheques';

/**
 * Los cheques listos para imprimir (`?ids=a,b,c`, de una misma chequera): cada uno a la medida de su formulario y su
 * comprobante. La vista previa no cambia nada; «Imprimir» registra la impresión y abre el diálogo del navegador.
 */
const { query } = useRoute();
const ids = String(query.ids ?? '')
  .split(',')
  .filter(Boolean);
const { vista, cargando, problema, parte, partes, situacion, avisosDeLaImpresion, imprimiendo, imprimir } =
  usarImpresionDeCheques(ids);

const volver = { texto: 'Volver a cheques', ruta: { name: 'bancos.cheques' } };
const titulo = computed(() => {
  const cantidad = vista.value?.cheques.length ?? ids.length;
  return cantidad === 1 ? 'Imprimir cheque' : `Imprimir ${cantidad} cheques`;
});
const botones = computed(() => {
  const hayOtra = partes.value.cheques > 0 && partes.value.comprobantes > 0;
  return (['cheques', 'comprobantes'] as ParteDeLaImpresion[])
    .filter((parte) => partes.value[parte] > 0)
    .map((parte) => ({ parte, texto: textoDeImprimir(parte, partes.value[parte], hayOtra) }));
});
</script>

<template>
  <div v-if="vista" class="space-y-4">
    <div class="space-y-4 print:hidden">
      <EncabezadoPagina
        :titulo="titulo"
        descripcion="Esta es la vista previa: cada cheque sale a la medida de su formulario y con su comprobante de egreso."
        :volver="volver"
      >
        <template v-if="situacion !== 'ya-impresa'">
          <BotonBase
            v-for="boton in botones"
            :key="boton.parte"
            v-permiso="situacion === 'por-registrar' ? 'bancos.cheques.imprimir' : 'bancos.cheques.ver'"
            :icono="Printer"
            :cargando="imprimiendo"
            @click="imprimir(boton.parte)"
          >
            {{ boton.texto }}
          </BotonBase>
        </template>
      </EncabezadoPagina>
      <p v-if="situacion === 'por-registrar'" class="text-sm text-tierra-600 dark:text-tierra-300">
        Al presionar «Imprimir» queda registrada la impresión: el cheque ya no se podrá blanquear y, si hay que sacar
        otra copia, se hará con «Reimprimir» y su motivo. Ponga los formularios en la impresora en el orden de los
        números.
      </p>
      <p
        v-else-if="situacion === 'registrada'"
        class="text-sm font-medium text-campo-700 dark:text-campo-400"
        role="status"
      >
        La impresión quedó registrada. Si la impresora falló, puede volver a enviarla desde aquí.
      </p>
      <p v-else class="text-sm text-tierra-600 dark:text-tierra-300" role="status">
        Este cheque ya se imprimió. Para sacar otra copia use «Reimprimir» en su tarjeta, con su motivo: así queda en la
        auditoría.
      </p>
      <AvisoDeTamanoReal :avisos="avisosDeLaImpresion" />
    </div>

    <div class="space-y-8 print:space-y-0">
      <ChequeParaImpresion
        v-for="(item, indice) in vista.cheques"
        :key="item.chequeId"
        :item="item"
        :parte="parte"
        :es-ultimo="indice === vista.cheques.length - 1"
      />
    </div>
  </div>
  <div v-else-if="!cargando" class="space-y-3 print:hidden">
    <EncabezadoPagina titulo="No se pudo preparar la impresión" :volver="volver" />
    <p class="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200" role="alert">
      {{ problema ?? 'No se pudo preparar la impresión.' }}
    </p>
  </div>
  <p v-else class="text-sm text-tierra-500 print:hidden" role="status">Preparando la impresión…</p>
</template>
