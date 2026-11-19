import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { armarCheque, type ChequeArmado } from '../../../dominio/impresion-de-cheque.js';
import { esClaveDePlantilla, plantillaDeFabrica } from '../../../dominio/formatos-de-cheque/plantillas.js';
import type { FormatoDeCheque } from '../../../dominio/formatos-de-cheque/tipos.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { resolverFormatoGuardado } from '../../formatos-de-cheque/resolucion-de-formato.js';
import type { DependenciasDeFormatosDeCheque } from './dependencias-de-formatos-de-cheque.js';

/** La hoja de prueba: los campos con datos de muestra, que el cliente dibuja con una regla y una cruz en el origen. */
export interface PruebaDeAlineacionDto {
  nombre: string;
  /** Si el formato ya pasó la prueba; la plantilla de fábrica sin formato propio nunca. El cliente advierte, no bloquea. */
  probado: boolean;
  cheque: ChequeArmado;
  /** La separación de las marcas de la regla, en milímetros. */
  reglaMm: number;
}

const BENEFICIARIO_DE_MUESTRA = 'PRUEBA — SIN VALOR';
const MONTO_DE_MUESTRA_EN_CENTAVOS = 123456;
const SEPARACION_DE_LA_REGLA_EN_MM = 10;

/**
 * Arma la hoja de prueba de alineación: se imprime en una hoja en blanco, se pone sobre un cheque contra la luz y se
 * corrigen el desplazamiento o las posiciones. No marca nada ni gasta cheques.
 */
export class ArmarPruebaDeAlineacion {
  constructor(private readonly dependencias: DependenciasDeFormatosDeCheque) {}

  /**
   * @throws RecursoNoEncontrado si no existe o no es de la cuenta.
   * @throws FormatoDeChequeDañado, BeneficiarioNoCabe, MontoEnLetrasNoCabe o MontoEnNumerosNoCabe si el formato no sirve.
   */
  deUnFormato(operador: Operador, formatoId: string): Promise<PruebaDeAlineacionDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const formato = await consultas.obtener(formatoId);
      const resuelto = resolverFormatoGuardado(formato);
      return this.armar(operador, { nombre: formato.nombre, probado: formato.probadoEn !== null, formato: resuelto });
    });
  }

  /** @throws RecursoNoEncontrado si la clave no es de una plantilla de fábrica. */
  async deUnaPlantilla(operador: Operador, clave: string): Promise<PruebaDeAlineacionDto> {
    if (!esClaveDePlantilla(clave)) throw new RecursoNoEncontrado('La plantilla de cheque');
    const { nombre, formato } = plantillaDeFabrica(clave);
    return this.armar(operador, { nombre, probado: false, formato });
  }

  private async armar(
    operador: Operador,
    { nombre, probado, formato }: { nombre: string; probado: boolean; formato: FormatoDeCheque },
  ): Promise<PruebaDeAlineacionDto> {
    const { reloj, lugarDeEmision } = this.dependencias;
    const cheque = armarCheque(formato, {
      fecha: await reloj.hoy(operador),
      lugar: await lugarDeEmision.de(operador),
      beneficiario: BENEFICIARIO_DE_MUESTRA,
      montoCentavos: MONTO_DE_MUESTRA_EN_CENTAVOS,
      concepto: 'Prueba de alineación',
      noNegociable: true,
      paraAbonoEnCuenta: formato.paraAbonoEnCuenta.visible,
    });
    return { nombre, probado, cheque, reglaMm: SEPARACION_DE_LA_REGLA_EN_MM };
  }
}
