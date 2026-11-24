import type { AvisoDeBancos } from '../../core/contratos/bancos.contratos.js';
import { fechaDeCorte } from '../dominio/apertura.js';
import { avisoDePosfechadoCobradoPronto } from './avisos-de-cheque-de-apertura.js';
import type { ConciliacionDto } from './dto/conciliacion.dto.js';

type Documento = Pick<ConciliacionDto, 'candidatos' | 'posfechadosCandidatos'>;

/** Los posfechados de la carga inicial que el documento tiene marcados. */
function posfechadosDeAperturaMarcados({ candidatos, posfechadosCandidatos }: Documento): Set<string> {
  const marcados = [...candidatos, ...posfechadosCandidatos].filter(
    (movimiento) => movimiento.marcado && movimiento.parteDeApertura === 'cheque_posfechado',
  );
  return new Set(marcados.map((movimiento) => movimiento.id));
}

/**
 * El aviso «posfechado cobrado pronto» (contador, 19/11/2026): sale una vez, al marcar en la primera conciliación de
 * la cuenta un posfechado de la carga inicial que antes no estaba marcado. No bloquea.
 */
export function avisosDeMarcas(
  { antes, despues }: { antes: Documento; despues: Documento },
  { esLaPrimera, fechaDeInicio }: { esLaPrimera: boolean; fechaDeInicio: string | null },
): AvisoDeBancos[] {
  if (!esLaPrimera) return [];
  const previos = posfechadosDeAperturaMarcados(antes);
  const nuevos = [...posfechadosDeAperturaMarcados(despues)].filter((id) => !previos.has(id));
  if (nuevos.length === 0) return [];
  return [avisoDePosfechadoCobradoPronto(fechaDeInicio ? fechaDeCorte(fechaDeInicio) : null)];
}
