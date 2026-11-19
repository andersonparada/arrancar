import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { CambioDeMontoAnulado } from '../../../dominio/eventos-de-fondos.js';
import { RECURSO_DE_FONDOS, type CambioDeMonto, type Fondo } from '../../../dominio/fondos.js';
import { efectivoEsperado } from '../../../dominio/monto-del-fondo.js';
import {
  exigirAnulacionDeAumentoPosible,
  exigirFondoSinUso,
  fechaDeAnulacionDelCambio,
} from '../../../dominio/reglas-del-fondo.js';
import type { FondoDto } from '../../dto/fondos.dto.js';
import type { DependenciasDeFondos } from './dependencias-de-fondos.js';
import { LectorDelFondo } from './lector-del-fondo.js';

/** Lo que hizo Bancos con el cheque o la nota, para fechar la anulación. */
export interface DatosDeAnularElCambio {
  motivo: string;
  enBancos: 'sin_inverso' | 'con_inverso' | null;
  /** La fecha del inverso; solo con `con_inverso`. */
  fechaDelInverso: string | null;
}

/** Lo que se anula: el cambio de monto del fondo y lo que Bancos hizo con su cheque o nota. */
export interface CambioPorAnular {
  fondo: Fondo;
  cambio: CambioDeMonto;
  datos: DatosDeAnularElCambio;
}

interface EventoPorArmar {
  fondoId: string;
  cambio: CambioDeMonto;
  fecha: string;
  enBancos: DatosDeAnularElCambio['enBancos'];
}

type Dependencias = Pick<DependenciasDeFondos, 'fondos' | 'consultas' | 'auditoria' | 'reloj'>;

/**
 * Anular la apertura o un aumento de un fondo, venga de la ventana de aquí o del aviso de Bancos: revisa que el fondo no
 * se haya usado, deja el cambio `anulado` con su fecha contable, cierra el fondo si era la apertura, lo audita como
 * estaba y arma el evento que quien llama publica al confirmar.
 */
export class AnuladorDeCambios {
  private readonly lector: LectorDelFondo;

  constructor(private readonly dependencias: Dependencias) {
    this.lector = new LectorDelFondo(dependencias);
  }

  /** @throws FondoConMovimientos si el fondo ya tiene comprobantes, arqueos, vales o reposiciones (o más cambios de monto);
   * AnulacionDejaElFondoSinMonto si al quitar un aumento el fondo quedaría en cero o negativo. */
  async revisar(fondo: Fondo, cambio: CambioDeMonto): Promise<void> {
    const { fondos, consultas } = this.dependencias;
    const uso = await consultas.usoDelFondo(fondo.id);
    const vigentes = (await fondos.cambios(fondo.id)).filter(({ estado }) => estado === 'vigente');
    const otros = cambio.tipo === 'apertura' ? vigentes.filter(({ id }) => id !== cambio.id).length : 0;
    exigirFondoSinUso(uso, otros);
    if (cambio.tipo !== 'apertura') await this.exigirQueElFondoQuedeConMonto(fondo, cambio);
  }

  /** Sin el aumento, el monto y el efectivo esperado deben seguir siendo mayores que cero. */
  private async exigirQueElFondoQuedeConMonto(fondo: Fondo, cambio: CambioDeMonto): Promise<void> {
    const cifras = (await this.dependencias.consultas.datosDeLectura([fondo.id])).get(fondo.id)!;
    exigirAnulacionDeAumentoPosible({
      montoCentavos: cifras.montoCentavos - cambio.montoCentavos,
      esperadoCentavos: efectivoEsperado(cifras) - cambio.montoCentavos,
    });
  }

  async anular(operador: Operador, por: CambioPorAnular): Promise<EventoDominio[]> {
    const { fondo, cambio, datos } = por;
    const { fondos, reloj } = this.dependencias;
    const anterior = await this.lector.leer(fondo);
    const hoy = await reloj.hoy(operador);
    const fecha = fechaDeAnulacionDelCambio({ ...datos, fecha: cambio.fecha, hoy });
    const anulacion = { anuladoPor: operador.usuarioId, motivo: datos.motivo, fechaDeAnulacion: fecha };
    await fondos.anularCambio(cambio.id, anulacion);
    if (cambio.tipo === 'apertura') {
      await fondos.cerrar(fondo.id, { fecha, cerradoPor: operador.usuarioId, motivo: datos.motivo });
    }
    await this.auditar(fondo, { anterior, motivo: datos.motivo });
    return [this.evento(operador, { fondoId: fondo.id, cambio, fecha, enBancos: datos.enBancos })];
  }

  private auditar(fondo: Fondo, { anterior, motivo }: { anterior: FondoDto; motivo: string }): Promise<void> {
    return this.dependencias.auditoria.registrar({
      recurso: RECURSO_DE_FONDOS,
      registroId: fondo.id,
      accion: 'anular',
      anterior,
      motivo,
    });
  }

  private evento(operador: Operador, por: EventoPorArmar) {
    const { fondoId, cambio, fecha, enBancos } = por;
    return new CambioDeMontoAnulado({
      empresaId: operador.empresaId,
      fondoId,
      cambioId: cambio.id,
      tipo: cambio.tipo as 'apertura' | 'aumento',
      fecha,
      fechaOriginal: cambio.fecha,
      montoCentavos: cambio.montoCentavos,
      anulacionEnBancos: enBancos,
    });
  }
}
