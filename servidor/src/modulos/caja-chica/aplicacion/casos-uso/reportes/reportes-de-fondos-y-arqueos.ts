import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos, deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { efectivoEsperado } from '../../../dominio/monto-del-fondo.js';
import type {
  EstadoDeFondoAlCorteDto,
  FilaDeArqueoDto,
  FondoDeArqueosDto,
  ReporteDeArqueosDto,
  ReporteDeEstadoDeFondosDto,
  ResultadoDelArqueo,
} from '../../dto/reportes.dto.js';
import type { ArqueoDeReporte, EstadoDeFondoAlCorte } from '../../puertos/puertos-de-reportes.js';
import {
  periodoDe,
  type DependenciasDeReportes,
  type SolicitudAlCorte,
  type SolicitudDePeriodo,
} from './reportes-de-comprobantes.js';

export const LEYENDAS_DE_ESTADO = [
  'Muestra los fondos abiertos al corte con las cifras de ese día: el monto, lo pendiente de reponer, los vales provisionales abiertos y el efectivo que debía haber en la caja.',
  'El último arqueo es el último vigente al corte; su diferencia es contra lo que el sistema esperaba al contar.',
];

const sumaDe = (fondos: readonly EstadoDeFondoAlCorteDto[], columna: keyof EstadoDeFondoAlCorteDto): string =>
  deCentavos(fondos.reduce((suma, fondo) => suma + aCentavos(String(fondo[columna])), 0));

function estadoDelFondo(fondo: EstadoDeFondoAlCorte): EstadoDeFondoAlCorteDto {
  const cifras = {
    montoCentavos: fondo.montoCentavos,
    pendienteCentavos: fondo.pendienteCentavos,
    valesCentavos: fondo.valesCentavos,
  };
  return {
    fondoId: fondo.fondoId,
    nombre: fondo.nombre,
    custodio: fondo.custodio,
    monto: deCentavos(fondo.montoCentavos),
    efectivoEsperado: deCentavos(efectivoEsperado(cifras)),
    pendienteDeReponer: deCentavos(fondo.pendienteCentavos),
    valesAbiertos: deCentavos(fondo.valesCentavos),
    ultimoArqueo: fondo.ultimoArqueo?.realizadoEn ?? null,
    diferenciaDelArqueo: fondo.ultimoArqueo ? deCentavos(fondo.ultimoArqueo.diferenciaCentavos) : null,
  };
}

/** CC-R4 (`reportes.ver`): el estado de los fondos al corte, con su último arqueo y su diferencia. */
export class ReporteDeEstadoDeFondos {
  constructor(private readonly dependencias: DependenciasDeReportes) {}

  ejecutar(operador: Operador, solicitud: SolicitudAlCorte): Promise<ReporteDeEstadoDeFondosDto> {
    const { unidadDeTrabajo, lecturas, reloj, zonaHoraria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const corte = solicitud.corte ?? (await reloj.hoy(operador));
      const filas = await lecturas.fondosAlCorte({
        corte,
        fondoId: solicitud.fondoId,
        zonaHoraria: await zonaHoraria.zonaHoraria(operador),
      });
      const fondos = filas.map(estadoDelFondo).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      return {
        corte,
        fondos,
        total: {
          monto: sumaDe(fondos, 'monto'),
          efectivoEsperado: sumaDe(fondos, 'efectivoEsperado'),
          pendienteDeReponer: sumaDe(fondos, 'pendienteDeReponer'),
          valesAbiertos: sumaDe(fondos, 'valesAbiertos'),
        },
        leyendas: LEYENDAS_DE_ESTADO,
      };
    });
  }
}

export const LEYENDAS_DE_ARQUEOS = [
  'Cuenta los arqueos vigentes del período, por el día de la empresa en que se contó; los anulados no cuentan.',
  'La diferencia negativa es un faltante y la positiva, un sobrante. El destino del faltante es perdida del fondo o cobro al custodio.',
];

const resultadoDe = (diferenciaCentavos: number): ResultadoDelArqueo => {
  if (diferenciaCentavos === 0) return 'cuadrado';
  return diferenciaCentavos < 0 ? 'faltante' : 'sobrante';
};

function filaDeArqueo({ arqueo, destino }: ArqueoDeReporte): FilaDeArqueoDto {
  return {
    id: arqueo.id,
    numero: arqueo.numero,
    realizadoEn: arqueo.realizadoEn,
    custodio: arqueo.custodio,
    efectivoContado: deCentavos(arqueo.efectivoContadoCentavos),
    efectivoEsperado: deCentavos(arqueo.efectivoEsperadoCentavos),
    diferencia: deCentavos(arqueo.diferenciaCentavos),
    resultado: resultadoDe(arqueo.diferenciaCentavos),
    destino,
    motivo: arqueo.motivoDeDiferencia,
  };
}

const sumarDiferencias = (arqueos: readonly ArqueoDeReporte[], signo: 1 | -1): number =>
  arqueos
    .map(({ arqueo }) => arqueo.diferenciaCentavos * signo)
    .filter((valor) => valor > 0)
    .reduce((suma, valor) => suma + valor, 0);

const cifrasDeDiferencias = (arqueos: readonly ArqueoDeReporte[]) => ({
  faltantes: deCentavos(sumarDiferencias(arqueos, -1)),
  sobrantes: deCentavos(sumarDiferencias(arqueos, 1)),
});

function fondosDeArqueos(arqueos: readonly ArqueoDeReporte[]): FondoDeArqueosDto[] {
  const porFondo = new Map<string, ArqueoDeReporte[]>();
  for (const item of arqueos) porFondo.set(item.arqueo.fondoId, [...(porFondo.get(item.arqueo.fondoId) ?? []), item]);
  return [...porFondo.entries()]
    .map(([fondoId, grupo]) => ({
      fondoId,
      fondoNombre: grupo[0]!.fondoNombre,
      cantidad: grupo.length,
      ...cifrasDeDiferencias(grupo),
      filas: grupo.map(filaDeArqueo),
    }))
    .sort((a, b) => a.fondoNombre.localeCompare(b.fondoNombre, 'es'));
}

/** CC-R5 (`reportes.ver`): los arqueos del período con sus diferencias y su destino. */
export class ReporteDeArqueos {
  constructor(private readonly dependencias: DependenciasDeReportes) {}

  /** @throws PeriodoInvertido si `desde` es posterior a `hasta`. */
  ejecutar(operador: Operador, solicitud: SolicitudDePeriodo): Promise<ReporteDeArqueosDto> {
    const { unidadDeTrabajo, lecturas, zonaHoraria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const periodo = await periodoDe(this.dependencias, { operador, solicitud });
      const arqueos = await lecturas.arqueosDelPeriodo({
        ...periodo,
        fondoId: solicitud.fondoId,
        zonaHoraria: await zonaHoraria.zonaHoraria(operador),
      });
      return {
        ...periodo,
        fondos: fondosDeArqueos(arqueos),
        total: { cantidad: arqueos.length, ...cifrasDeDiferencias(arqueos) },
        leyendas: LEYENDAS_DE_ARQUEOS,
      };
    });
  }
}
