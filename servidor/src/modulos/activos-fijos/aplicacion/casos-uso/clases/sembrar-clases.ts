import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Clase } from '../../../dominio/clase.js';
import { CLASES_SUGERIDAS, type ClaseSugerida } from '../../../dominio/clases-iniciales.js';
import type { TopesPorInciso } from '../../puertos/lector-de-topes.js';
import type { DependenciasDeClases } from './dependencias-de-clases.js';

/** Si la instalación bajó el tope de ley del inciso, la sugerida no lo pasa. */
function datosDeLaSugerida({ nombre, incisoFiscal, porcentajeFiscal }: ClaseSugerida, topes: TopesPorInciso) {
  const maximo = topes[incisoFiscal].porcentajeMaximo;
  const porcentaje = Math.min(Number(porcentajeFiscal), maximo);
  return {
    nombre,
    incisoFiscal,
    porcentajeFiscal: porcentaje.toFixed(2),
    vidaUtilContableMeses: null,
    valorResidualPorcentaje: '0.00',
    activo: true,
  };
}

/**
 * Da a la empresa su lista sugerida de clases. Solo actúa si no tiene ninguna (empresa nueva o que activa el
 * módulo después); una vez sembrada, la empresa manda y nada se vuelve a agregar. Corre dentro de la unidad de
 * trabajo de quien la llama, con la empresa a sembrar como empresa activa.
 */
export class SembrarClases {
  constructor(private readonly dependencias: Pick<DependenciasDeClases, 'repositorio' | 'topes'>) {}

  async ejecutar(operador: Operador): Promise<void> {
    const { repositorio, topes } = this.dependencias;
    if (await repositorio.hayAlguna()) return;
    const topesDeLey = await topes.paraEmpresa(operador);
    const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
    const clases = CLASES_SUGERIDAS.map((sugerida) => {
      const datos = datosDeLaSugerida(sugerida, topesDeLey);
      return Clase.crear(empresaId, datos, topesDeLey[sugerida.incisoFiscal]);
    });
    await repositorio.sembrar(clases);
  }
}
