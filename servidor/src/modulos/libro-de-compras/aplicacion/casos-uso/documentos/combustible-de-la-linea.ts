import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { aCentavos, deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { calcularIdp } from '../../../dominio/calculo-de-linea.js';
import type { CombustibleDeLineaGuardada } from '../../../dominio/documento-de-compra.js';
import { CombustibleSinTasaVigente } from '../../../dominio/errores-de-calculo.js';
import { CatalogoInactivo, LineaDeDocumentoInvalida } from '../../../dominio/errores-de-documento.js';
import type { SolicitudDeLinea } from '../../dto/solicitud-de-documento.js';
import type { CombustibleConTasa } from '../../puertos/puertos-de-documentos.js';

/** El combustible de la línea (si lleva galones y tasa) y los avisos de la comparación con el IDP escrito. */
export interface CombustibleResuelto {
  combustible: CombustibleDeLineaGuardada | null;
  avisos: string[];
}

/** Monto en centavos del IDP que escribió el usuario; `null` si no lo escribió (o escribió cero). */
export function idpEscritoDe(linea: Pick<SolicitudDeLinea, 'idpEscrito'>): number | null {
  const centavos = aCentavos(linea.idpEscrito ?? '0');
  return centavos > 0 ? centavos : null;
}

function exigirCombustibleYGalones(linea: SolicitudDeLinea): void {
  if (linea.combustibleId !== null && linea.galones === null) {
    throw new LineaDeDocumentoInvalida('Escriba los galones del combustible, o deje solo el IDP de la factura.');
  }
  if (linea.combustibleId === null && linea.galones !== null) {
    throw new LineaDeDocumentoInvalida('Una línea de combustible lleva el combustible y los galones.');
  }
}

function avisoDeIdpDistinto(
  escrito: number,
  combustible: CombustibleConTasa,
  guardado: CombustibleDeLineaGuardada,
): string[] {
  const calculado = calcularIdp(guardado);
  if (calculado === escrito) return [];
  return [
    `El IDP de la factura (Q ${deCentavos(escrito)}) no coincide con el de ${guardado.galones} galones de ` +
      `${combustible.nombre} (Q ${deCentavos(calculado)}): revise los galones o el IDP.`,
  ];
}

/**
 * Busca la tasa de IDP del combustible en la fecha de emisión. Con el IDP escrito la comprobación es opcional: sin tasa
 * se registra sin comparar y con aviso; si el IDP se calcula, la falta de tasa es un error.
 *
 * @throws CombustibleSinTasaVigente si el IDP se calcula y el combustible no tiene tasa en la fecha.
 */
export function resolverCombustible(
  linea: SolicitudDeLinea,
  catalogo: { combustibles: Map<string, CombustibleConTasa>; fechaDeEmision: string },
): CombustibleResuelto {
  exigirCombustibleYGalones(linea);
  if (linea.combustibleId === null || linea.galones === null) return { combustible: null, avisos: [] };
  const combustible = catalogo.combustibles.get(linea.combustibleId);
  if (!combustible) throw new RecursoNoEncontrado('El combustible');
  if (!combustible.activo) throw new CatalogoInactivo(`El combustible "${combustible.nombre}" está inactivo.`);
  const escrito = idpEscritoDe(linea);
  if (!combustible.vigencia) {
    if (escrito === null) throw new CombustibleSinTasaVigente(combustible.nombre, catalogo.fechaDeEmision);
    return {
      combustible: null,
      avisos: [`No hay tasa de IDP para ${combustible.nombre} en la fecha de emisión: no se comprobó el IDP.`],
    };
  }
  const { id, idpPorGalon, porcentajeDeEtanol } = combustible.vigencia;
  const guardado = { vigenciaDeCombustibleId: id, galones: linea.galones, idpPorGalon, porcentajeDeEtanol };
  return { combustible: guardado, avisos: escrito === null ? [] : avisoDeIdpDistinto(escrito, combustible, guardado) };
}
