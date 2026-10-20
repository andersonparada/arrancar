import { ref, watch, type Ref } from 'vue';
import type { ConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';
import type { DestinoDeDocumento, DocumentoEnLista } from '../../servicios/documentos.api';
import { apiRegistroDeDocumentos, type ProveedorParaRegistro } from '../../servicios/registro-de-documentos.api';
import type { EdicionDeDocumento } from './edicion-de-documento';
import {
  alCambiarElTipo,
  alCambiarLaEmision,
  alElegirProveedor,
  opcionesDeFacturas,
  proponerElNitDeLaEmpresa,
} from './reglas-del-formulario-de-documento';
import { proponerConceptoDeIntereses } from './notas-de-debito';
import { llevaFacturaAfectada } from './tipos-de-documento-sat';

interface Datos {
  edicion: EdicionDeDocumento;
  proveedores: Readonly<Ref<ProveedorParaRegistro[]>>;
  destinos: Readonly<Ref<DestinoDeDocumento[]>>;
  conceptos: Readonly<Ref<ConceptoDeGasto[]>>;
  nitDeLaEmpresa: Readonly<Ref<string | null>>;
}

/** Propone el destino de la última factura de ese proveedor, si sigue activo. Si no se puede traer, no pasa nada. */
function crearProponedorDeDestino({ edicion, destinos }: Pick<Datos, 'edicion' | 'destinos'>) {
  let numeroDePeticion = 0;
  return async (proveedorId: string): Promise<void> => {
    const peticion = ++numeroDePeticion;
    const sugerido = await apiRegistroDeDocumentos.destinoSugerido(proveedorId).catch(() => null);
    const destino = sugerido?.destino;
    if (peticion === numeroDePeticion && destino && destinos.value.includes(destino)) edicion.destino = destino;
  };
}

/** Las facturas vigentes del proveedor, que una nota de crédito o de débito puede corregir. */
function usarFacturasDeLaNota(edicion: EdicionDeDocumento) {
  const documentos = ref<DocumentoEnLista[]>([]);

  async function traer(proveedorId: string | null): Promise<void> {
    documentos.value = [];
    if (!proveedorId || !llevaFacturaAfectada(edicion.tipoDte)) return;
    const pagina = await apiRegistroDeDocumentos.documentosVigentesDelProveedor(proveedorId).catch(() => null);
    if (edicion.proveedorId === proveedorId) documentos.value = pagina?.elementos ?? [];
  }

  // Una nota va al mismo destino que la factura que rebaja.
  watch(
    () => edicion.documentoAfectadoId,
    (id) => {
      const factura = opcionesDeFacturas(documentos.value).find(({ valor }) => valor === id);
      if (factura) edicion.destino = factura.destino;
    },
  );

  return { documentos, traer };
}

/** Con un solo destino activo no hay nada que elegir. */
function elegirElUnicoDestino(edicion: EdicionDeDocumento, destinos: Readonly<Ref<DestinoDeDocumento[]>>): void {
  watch(destinos, (activos) => {
    if (activos.length === 1) edicion.destino ??= activos[0] ?? null;
  });
}

/** Al elegir «Intereses» se propone el gasto financiero en la línea que aún no tiene concepto. */
function proponerElGastoFinanciero(edicion: EdicionDeDocumento, conceptos: Readonly<Ref<ConceptoDeGasto[]>>): void {
  watch(
    () => edicion.claseDeCargo,
    (clase) => {
      if (clase === 'intereses') proponerConceptoDeIntereses(edicion, conceptos.value);
    },
  );
}

/** En la factura especial la recepción acompaña a la emisión. */
function vigilarLaEmision(edicion: EdicionDeDocumento): void {
  watch(
    () => edicion.fechaEmision,
    (_, anterior) => alCambiarLaEmision(edicion, anterior),
  );
}

/**
 * Lo que pasa en el formulario al elegir el proveedor o el tipo: se propone su NIT, el destino de su último
 * documento y, en una nota, se ofrecen sus facturas. Si algo de eso no se puede traer (sin permiso, sin
 * conexión) el formulario sigue: el usuario lo escribe.
 */
export function usarProveedorDelDocumento({ edicion, proveedores, destinos, conceptos, nitDeLaEmpresa }: Datos) {
  const proponerElDestino = crearProponedorDeDestino({ edicion, destinos });
  const facturas = usarFacturasDeLaNota(edicion);
  elegirElUnicoDestino(edicion, destinos);
  proponerElGastoFinanciero(edicion, conceptos);

  const proveedorElegido = () => proveedores.value.find(({ id }) => id === edicion.proveedorId);

  watch(
    () => edicion.proveedorId,
    async (proveedorId) => {
      alElegirProveedor(edicion, proveedorElegido());
      await facturas.traer(proveedorId);
      if (proveedorId) await proponerElDestino(proveedorId);
    },
  );
  watch(
    () => edicion.tipoDte,
    async (_, anterior) => {
      alCambiarElTipo(edicion, anterior, { proveedor: proveedorElegido(), nitDeLaEmpresa: nitDeLaEmpresa.value });
      await facturas.traer(edicion.proveedorId);
    },
  );
  // El NIT de la empresa puede llegar después del tipo: el recibo FEL lo toma cuando ya está.
  watch(nitDeLaEmpresa, (nit) => proponerElNitDeLaEmpresa(edicion, nit));
  vigilarLaEmision(edicion);

  return { documentos: facturas.documentos };
}
