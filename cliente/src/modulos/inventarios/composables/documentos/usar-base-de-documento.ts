import { computed, type Ref } from 'vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { EdicionDeRenglon } from './edicion-de-renglones';
import { resumenDeDocumento } from './resumen-de-documento';
import { usarCatalogoDeRenglones } from './usar-catalogo-de-renglones';
import { usarBodegasDeDocumento } from './usar-referencias-de-documento';
import { usarRegistroDeDocumento } from './usar-registro-de-documento';
import { usarRenglones } from './usar-renglones';

interface EncabezadoComun {
  fecha: string;
  bodegaId: string | null;
  renglones: EdicionDeRenglon[];
}

function resumenDelEncabezado(encabezado: EncabezadoComun, bodegas: OpcionDeRegistro[], tipo: 'entrada' | 'salida') {
  const { fecha, bodegaId, renglones } = encabezado;
  const bodega = bodegas.find((opcion) => opcion.valor === bodegaId)?.texto ?? '';
  return resumenDeDocumento({ tipo, fecha, bodega, renglones });
}

/**
 * Lo que comparten la entrada y la salida: la bodega (con una sola, se elige sola), el catálogo de artículos, las
 * acciones sobre los renglones y el registro con confirmación.
 */
export function usarBaseDeDocumento(edicion: Ref<EncabezadoComun>, tipo: 'entrada' | 'salida') {
  const opcionesDeBodegas = usarBodegasDeDocumento((unica) => {
    if (unica && !edicion.value.bodegaId) edicion.value.bodegaId = unica;
  });
  const catalogo = usarCatalogoDeRenglones();
  const renglones = usarRenglones(
    computed({ get: () => edicion.value.renglones, set: (valor) => (edicion.value.renglones = valor) }),
    catalogo,
    tipo === 'salida',
  );
  const registro = usarRegistroDeDocumento();
  const resumen = () => resumenDelEncabezado(edicion.value, opcionesDeBodegas.value, tipo);

  return {
    opcionesDeBodegas,
    catalogo,
    renglones,
    resumen,
    registrar: registro.registrar,
    enviando: registro.enviando,
    errores: registro.errores,
  };
}
