import type { PoliticaDeAnticipos, ReferenciasDelAnticipo } from '../aplicacion/puertos/puertos-de-anticipos.js';

export class ReferenciasFalsas implements ReferenciasDelAnticipo {
  tercero: string | null = 'Ana López';
  usuarioValido = true;
  localidadValida = true;

  async nombreDelTercero(): Promise<string | null> {
    return this.tercero;
  }

  async usuarioDeLaEmpresa(): Promise<boolean> {
    return this.usuarioValido;
  }

  async localidadDeLaEmpresa(): Promise<boolean> {
    return this.localidadValida;
  }
}

export class PoliticaFija implements PoliticaDeAnticipos {
  dias = 15;
  bloquear = false;

  async diasParaLiquidar(): Promise<number> {
    return this.dias;
  }

  async bloquearConVencidos(): Promise<boolean> {
    return this.bloquear;
  }
}
