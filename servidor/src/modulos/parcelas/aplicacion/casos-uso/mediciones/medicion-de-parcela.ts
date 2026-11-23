import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { MedicionConFechaFutura } from '../../../dominio/errores-de-parcela.js';
import { Medicion } from '../../../dominio/medicion.js';
import type { Parcela } from '../../../dominio/parcela.js';
import type { SolicitudDeMedicion } from '../../dto/medicion.dto.js';
import type { DependenciasDeParcelas } from '../parcelas/dependencias-de-parcelas.js';

type Dependencias = Pick<
  DependenciasDeParcelas,
  'repositorio' | 'mediciones' | 'consultasDeMediciones' | 'configuracion' | 'reloj'
>;

/**
 * Copia la medición vigente más reciente a la parcela (o deja la superficie vacía si ya no hay ninguna). Corre dentro de
 * la unidad de trabajo del caso de uso que registró o anuló la medición.
 */
export async function recalcularSuperficie(
  dependencias: Pick<Dependencias, 'repositorio' | 'consultasDeMediciones'>,
  parcela: Parcela,
): Promise<void> {
  const vigente = await dependencias.consultasDeMediciones.superficieVigente(parcela.id.valor);
  parcela.fijarSuperficie(vigente);
  await dependencias.repositorio.guardar(parcela);
}

/**
 * Convierte la cifra escrita con los factores de la configuración, guarda la medición y actualiza la superficie de la
 * parcela. La parcela ya debe estar guardada.
 * @throws MedicionConFechaFutura si la medición rige desde una fecha que aún no llega.
 */
export async function registrarMedicionDeParcela(
  dependencias: Dependencias,
  operador: Operador,
  { parcela, datos }: { parcela: Parcela; datos: SolicitudDeMedicion },
): Promise<void> {
  if (datos.vigenteDesde > (await dependencias.reloj.hoy(operador))) throw new MedicionConFechaFutura();
  const factores = await dependencias.configuracion.factores(operador);
  const medicion = Medicion.registrar(
    { empresaId: Identificador.desde(operador.empresaId), parcelaId: parcela.id.valor, factores },
    datos,
  );
  await dependencias.mediciones.agregar(medicion);
  await recalcularSuperficie(dependencias, parcela);
}
