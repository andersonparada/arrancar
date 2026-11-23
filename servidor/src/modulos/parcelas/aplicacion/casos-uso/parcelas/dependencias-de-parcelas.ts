import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Parcela } from '../../../dominio/parcela.js';
import type { FichaDeParcelaDto } from '../../dto/parcela.dto.js';
import type { ConsultasParcelas } from '../../puertos/consultas-parcelas.js';
import type { ConfiguracionDeParcelas, AvisosDeParcela } from '../../puertos/configuracion-y-avisos.js';
import type { ConsultasMediciones, RepositorioMediciones } from '../../puertos/mediciones.js';
import type { LigasDeInmuebles, RepositorioParcelas } from '../../puertos/repositorio-parcelas.js';

/** Lo que usan los casos de uso de las parcelas y de sus mediciones. */
export interface DependenciasDeParcelas {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioParcelas;
  consultas: ConsultasParcelas;
  ligas: LigasDeInmuebles;
  mediciones: RepositorioMediciones;
  consultasDeMediciones: ConsultasMediciones;
  configuracion: ConfiguracionDeParcelas;
  avisos: AvisosDeParcela;
  reloj: Reloj;
  auditoria: Auditoria;
}

/** @throws RecursoNoEncontrado si no existe o el operador no la ve (empresa o localidad ajena). */
export async function parcelaExistente(
  repositorio: Pick<RepositorioParcelas, 'buscar'>,
  id: string,
  nombre = 'La parcela',
): Promise<Parcela> {
  const parcela = await repositorio.buscar(Identificador.desde(id));
  if (!parcela) throw new RecursoNoEncontrado(nombre);
  return parcela;
}

/** La parcela con sus mediciones, los inmuebles que abarca y cuántas subparcelas activas tiene. */
export async function fichaDeParcela(
  dependencias: Pick<DependenciasDeParcelas, 'consultas' | 'consultasDeMediciones' | 'ligas'>,
  parcelaId: string,
): Promise<FichaDeParcelaDto> {
  const { consultas, consultasDeMediciones, ligas } = dependencias;
  const parcela = await consultas.obtener(parcelaId);
  return {
    ...parcela,
    mediciones: await consultasDeMediciones.listar(parcelaId),
    inmuebles: await ligas.listar(parcelaId),
    hijasActivas: await consultas.contarHijasActivas(parcelaId),
  };
}
