import type {
  ConsultasDeCorrelativos,
  ExplicacionPorNumero,
  HuecosPorExplicar,
  RangoDeCorrelativo,
} from '../aplicacion/puertos/consultas-de-correlativos.js';

/** Los correlativos y la auditoría que la prueba dicte; sin base de datos. */
export class ConsultasDeCorrelativosFijas implements ConsultasDeCorrelativos {
  readonly consultadas: HuecosPorExplicar[] = [];

  constructor(
    private readonly rangosFijos: RangoDeCorrelativo[],
    private readonly auditoria: ExplicacionPorNumero[] = [],
  ) {}

  async rangos(clave?: string): Promise<RangoDeCorrelativo[]> {
    return this.rangosFijos.filter((rango) => !clave || rango.clave === clave);
  }

  async explicaciones(porExplicar: HuecosPorExplicar): Promise<ExplicacionPorNumero[]> {
    this.consultadas.push(porExplicar);
    return this.auditoria.filter((explicacion) => porExplicar.huecos.includes(explicacion.numero));
  }
}
