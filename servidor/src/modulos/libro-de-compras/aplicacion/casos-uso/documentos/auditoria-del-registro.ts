import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { retencionesAjustadas } from '../../../dominio/ajuste-de-retenciones.js';
import type { RegimenDeIvaDeProveedor } from '../../../dominio/datos-fiscales-de-proveedor.js';
import type { DocumentoDeCompra } from '../../../dominio/documento-de-compra.js';
import { dtoDeRetencion } from './dto-de-documento.js';
import type { DocumentoPreparado } from './preparador-de-documento.js';

const RECURSO_DE_RETENCIONES = 'libro-de-compras.retenciones';

/** Cada retención que el usuario cambió o quitó queda como `corregir`, con la propuesta como estaba. */
async function auditarAjustes(auditoria: Auditoria, documento: DocumentoDeCompra): Promise<void> {
  for (const retencion of retencionesAjustadas(documento.retenciones)) {
    await auditoria.registrar({
      recurso: RECURSO_DE_RETENCIONES,
      registroId: documento.id,
      accion: 'corregir',
      anterior: dtoDeRetencion({ ...retencion, monto: retencion.montoPropuesto, motivoDelAjuste: null }),
      motivo: retencion.motivoDelAjuste,
    });
  }
}

/** Lo que el sistema dejó en cero por una retención ya practicada en un documento anulado, con lo que habría propuesto. */
async function auditarRetencionesEnCero(
  auditoria: Auditoria,
  documento: DocumentoDeCompra,
  enCero: DocumentoPreparado['retencionesEnCero'],
): Promise<void> {
  for (const { regla, montoCalculado } of enCero) {
    const retencion = documento.retenciones.find((candidata) => candidata.regla === regla);
    if (!retencion) continue;
    await auditoria.registrar({
      recurso: RECURSO_DE_RETENCIONES,
      registroId: documento.id,
      accion: 'corregir',
      anterior: dtoDeRetencion({ ...retencion, monto: montoCalculado, montoPropuesto: montoCalculado }),
      motivo: retencion.motivoDelAjuste,
    });
  }
}

/** El tipo no correspondía al régimen guardado del proveedor y el usuario confirmó que cambió de régimen. */
async function auditarCambioDeRegimen(
  auditoria: Auditoria,
  documento: DocumentoDeCompra,
  regimenGuardado: RegimenDeIvaDeProveedor,
): Promise<void> {
  await auditoria.registrar({
    recurso: 'libro-de-compras.documentos',
    registroId: documento.id,
    accion: 'corregir',
    anterior: { proveedorId: documento.proveedorId, regimenIvaSegunSusDatos: regimenGuardado },
    motivo: `El proveedor cambió de régimen: se registró una ${documento.tipo} aunque sus datos fiscales decían ${regimenGuardado}.`,
  });
}

/**
 * Lo que queda en la auditoría al registrar, en la misma transacción: las retenciones que el usuario ajustó, las que
 * el sistema dejó en cero por una retención ya practicada y la confirmación de un cambio de régimen del proveedor.
 */
export async function auditarRegistro(
  auditoria: Auditoria,
  documento: DocumentoDeCompra,
  preparado: DocumentoPreparado,
): Promise<void> {
  await auditarAjustes(auditoria, documento);
  await auditarRetencionesEnCero(auditoria, documento, preparado.retencionesEnCero);
  if (preparado.cambioDeRegimenConfirmado) {
    await auditarCambioDeRegimen(auditoria, documento, preparado.regimenDelProveedor);
  }
}
