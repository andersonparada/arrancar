import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';
import type { CuentaId } from '../../core/compartido/dominio/identificador.js';
import type { TipoDePapel } from './papeles.js';
import type { TerceroId } from './tercero.js';

interface DatosDelTercero {
  terceroId: string;
  cuentaId: string;
}

function datosDel(terceroId: TerceroId, cuentaId: CuentaId): DatosDelTercero {
  return { terceroId: terceroId.valor, cuentaId: cuentaId.valor };
}

export class TerceroCreado extends EventoDominio<DatosDelTercero> {
  readonly nombre = 'terceros.creado';

  constructor(terceroId: TerceroId, cuentaId: CuentaId) {
    super(datosDel(terceroId, cuentaId));
  }
}

export class TerceroActualizado extends EventoDominio<DatosDelTercero> {
  readonly nombre = 'terceros.actualizado';

  constructor(terceroId: TerceroId, cuentaId: CuentaId) {
    super(datosDel(terceroId, cuentaId));
  }
}

/** Ya no se puede elegir en otros módulos, aunque su historial se conserva. */
export class TerceroInactivado extends EventoDominio<DatosDelTercero> {
  readonly nombre = 'terceros.inactivado';

  constructor(terceroId: TerceroId, cuentaId: CuentaId) {
    super(datosDel(terceroId, cuentaId));
  }
}

export class PapelAsignado extends EventoDominio<DatosDelTercero & { papel: TipoDePapel }> {
  readonly nombre = 'terceros.papel_asignado';

  constructor(terceroId: TerceroId, cuentaId: CuentaId, papel: TipoDePapel) {
    super({ ...datosDel(terceroId, cuentaId), papel });
  }
}

export class PapelQuitado extends EventoDominio<DatosDelTercero & { papel: TipoDePapel }> {
  readonly nombre = 'terceros.papel_quitado';

  constructor(terceroId: TerceroId, cuentaId: CuentaId, papel: TipoDePapel) {
    super({ ...datosDel(terceroId, cuentaId), papel });
  }
}
