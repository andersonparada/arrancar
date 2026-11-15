import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { DocumentoDeCompra } from '../../../dominio/documento-de-compra.js';
import { FacturaYaEsDelSistemaAnterior } from '../../../dominio/errores-de-factura-anterior.js';
import { FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO, type TipoDeDocumento } from '../../../dominio/tipos-de-documento.js';
import type {
  ClaveDeFacturaAnterior,
  RepositorioDeFacturasAnteriores,
} from '../../puertos/puertos-de-facturas-anteriores.js';
import { dtoDeFacturaAnterior } from '../../dto/factura-anterior.dto.js';
import type { FacturaAnteriorResuelta } from './resolutor-de-factura-anterior.js';

interface Dependencias {
  facturasAnteriores: RepositorioDeFacturasAnteriores;
  auditoria: Auditoria;
}

/**
 * Una factura que otra nota vigente ya cita como «del sistema anterior» no se registra en el libro: se explica el
 * camino (anular la nota, registrar la factura y volver a registrar la nota).
 * @throws FacturaYaEsDelSistemaAnterior.
 */
export async function exigirQueNoSeaDelSistemaAnterior(
  { facturasAnteriores }: Dependencias,
  documento: DocumentoDeCompra,
): Promise<void> {
  const { tipo, proveedorId, serie, numero, autorizacionFel } = documento;
  await exigirQueLaClaveNoSeaDelSistemaAnterior(facturasAnteriores, tipo, {
    proveedorId,
    serie,
    numero,
    autorizacionFel,
  });
}

/** Lo mismo con solo la clave del documento: lo usa también la vista previa de la bandeja para no anticipar un registro imposible. */
export async function exigirQueLaClaveNoSeaDelSistemaAnterior(
  facturasAnteriores: RepositorioDeFacturasAnteriores,
  tipo: TipoDeDocumento,
  clave: ClaveDeFacturaAnterior,
): Promise<void> {
  if (!FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO.includes(tipo)) return;
  const nota = await facturasAnteriores.buscarNotaVigenteQueLaCita(clave);
  if (nota) throw new FacturaYaEsDelSistemaAnterior(nota);
}

/** Crea o corrige la fila de la factura anterior antes de guardar la nota que la cita; corregirla deja su rastro. */
export async function guardarLaFacturaAnterior(
  { facturasAnteriores, auditoria }: Dependencias,
  documento: DocumentoDeCompra,
  resuelta: FacturaAnteriorResuelta | null,
): Promise<void> {
  if (!resuelta || resuelta.accion === 'reutilizar') return;
  if (resuelta.accion === 'crear') {
    await facturasAnteriores.agregar(documento.empresaId, resuelta.guardada);
    return;
  }
  await facturasAnteriores.corregir(resuelta.guardada);
  await auditoria.registrar({
    recurso: 'libro-de-compras.facturas-anteriores',
    registroId: resuelta.guardada.id,
    accion: 'corregir',
    anterior: dtoDeFacturaAnterior(resuelta.anterior!),
    motivo: `La nota ${documento.serie ? `${documento.serie}-` : ''}${documento.numero} corrigió los datos de la factura.`,
  });
}
