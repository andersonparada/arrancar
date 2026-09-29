import { aCentavos, deCentavos } from '../dominio/centavos.js';
import type {
  FiltroDeIntereses,
  InteresDelReporteDto,
  InteresesDeUnaCuentaDto,
  ReporteDeInteresesDto,
} from './dto/intereses.dto.js';

interface Suma {
  cantidad: number;
  bruto: number;
  isr: number;
  neto: number;
}

const SUMA_VACIA: Suma = { cantidad: 0, bruto: 0, isr: 0, neto: 0 };

/** Suma en centavos enteros: nunca se suman decimales. */
function sumar(base: Suma, nota: InteresDelReporteDto): Suma {
  return {
    cantidad: base.cantidad + 1,
    bruto: base.bruto + aCentavos(nota.interesBruto),
    isr: base.isr + aCentavos(nota.isrRetenido),
    neto: base.neto + aCentavos(nota.neto),
  };
}

const enTexto = ({ bruto, isr, neto }: Suma) => ({
  interesBruto: deCentavos(bruto),
  isrRetenido: deCentavos(isr),
  neto: deCentavos(neto),
});

function porCuenta(notas: InteresDelReporteDto[]): InteresesDeUnaCuentaDto[] {
  const sumas = new Map<string, { nombre: string; suma: Suma }>();
  for (const nota of notas) {
    const actual = sumas.get(nota.cuentaBancariaId) ?? { nombre: nota.cuentaBancariaNombre, suma: SUMA_VACIA };
    sumas.set(nota.cuentaBancariaId, { nombre: actual.nombre, suma: sumar(actual.suma, nota) });
  }
  return [...sumas]
    .map(([cuentaBancariaId, { nombre, suma }]) => ({
      cuentaBancariaId,
      cuentaBancariaNombre: nombre,
      cantidad: suma.cantidad,
      ...enTexto(suma),
    }))
    .sort((a, b) => a.cuentaBancariaNombre.localeCompare(b.cuentaBancariaNombre));
}

/** Arma el reporte de intereses: cada nota, los totales de cada cuenta y el total general. */
export function armarReporteDeIntereses(
  notas: InteresDelReporteDto[],
  { filtro, notasSinDatos }: { filtro: FiltroDeIntereses; notasSinDatos: number },
): ReporteDeInteresesDto {
  const total = notas.reduce(sumar, SUMA_VACIA);
  return {
    desde: filtro.desde,
    hasta: filtro.hasta,
    cuentaBancariaId: filtro.cuentaBancariaId ?? null,
    totalDeNotas: total.cantidad,
    ...enTexto(total),
    notasSinDatos,
    porCuenta: porCuenta(notas),
    intereses: notas,
  };
}
