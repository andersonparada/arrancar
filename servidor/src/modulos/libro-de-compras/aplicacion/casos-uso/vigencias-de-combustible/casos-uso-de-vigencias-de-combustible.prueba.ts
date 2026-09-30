import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoEnUso, RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { VigenciaDeCombustibleEnUso, VigenciaDeCombustibleInvalido } from '../../../dominio/vigencia-de-combustible.js';
import { VigenciasDeCombustibleEnMemoria } from '../../../pruebas/dobles-de-vigencias-de-combustible.js';
import type { SolicitudDeVigenciaDeCombustible } from '../../dto/vigencia-de-combustible.dto.js';
import { ActualizarVigenciaDeCombustible } from './actualizar-vigencia-de-combustible.js';
import { CrearVigenciaDeCombustible } from './crear-vigencia-de-combustible.js';
import { EliminarVigenciaDeCombustible } from './eliminar-vigencia-de-combustible.js';
import { ListarVigenciasDeCombustible } from './listar-vigencias-de-combustible.js';
import { ObtenerVigenciaDeCombustible } from './obtener-vigencia-de-combustible.js';

const operador = operadorDePrueba();
const COMBUSTIBLE = '00000000-0000-4000-8000-000000000001';
const OTRO_COMBUSTIBLE = '00000000-0000-4000-8000-000000000002';

const solicitud = (cambios: Partial<SolicitudDeVigenciaDeCombustible> = {}): SolicitudDeVigenciaDeCombustible => ({
  combustibleId: COMBUSTIBLE,
  idpPorGalon: '4.70',
  porcentajeDeEtanol: '10.00',
  vigenteDesde: '2026-01-01',
  vigenteHasta: null,
  ...cambios,
});

let auditoria: AuditoriaEnMemoria;
let registros: VigenciasDeCombustibleEnMemoria;

function casosDeUso() {
  registros = new VigenciasDeCombustibleEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    auditoria,
  };
  return {
    listar: new ListarVigenciasDeCombustible(dependencias),
    obtener: new ObtenerVigenciaDeCombustible(dependencias),
    crear: new CrearVigenciaDeCombustible(dependencias),
    actualizar: new ActualizarVigenciaDeCombustible(dependencias),
    eliminar: new EliminarVigenciaDeCombustible(dependencias),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

describe('registrar una vigencia', () => {
  it('aparece en la lista y bloquea antes el combustible', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    expect(await casos.listar.ejecutar(operador)).toEqual([creado]);
    expect(registros.bloqueos).toEqual([COMBUSTIBLE]);
  });

  it('la tasa nueva cierra la abierta el día anterior', async () => {
    const primera = await casos.crear.ejecutar(operador, solicitud());

    await casos.crear.ejecutar(operador, solicitud({ idpPorGalon: '5.10', vigenteDesde: '2026-03-01' }));

    expect((await casos.obtener.ejecutar(operador, primera.id)).vigenteHasta).toBe('2026-02-28');
  });

  it('no toca la abierta de otro combustible', async () => {
    const ajena = await casos.crear.ejecutar(operador, solicitud({ combustibleId: OTRO_COMBUSTIBLE }));

    await casos.crear.ejecutar(operador, solicitud({ vigenteDesde: '2026-03-01' }));

    expect((await casos.obtener.ejecutar(operador, ajena.id)).vigenteHasta).toBeNull();
  });

  it('una vigencia con cierre propio no cierra la abierta (un historial puede cargarse en cualquier orden)', async () => {
    const abierta = await casos.crear.ejecutar(operador, solicitud({ vigenteDesde: '2026-06-01' }));

    await casos.crear.ejecutar(operador, solicitud({ vigenteDesde: '2026-01-01', vigenteHasta: '2026-05-31' }));

    expect((await casos.obtener.ejecutar(operador, abierta.id)).vigenteHasta).toBeNull();
  });

  it('si la tasa anterior ya se usó después del día de cierre, no se puede cerrar', async () => {
    const primera = await casos.crear.ejecutar(operador, solicitud());
    registros.marcarEnUso(primera.id, '2026-03-10');

    const nueva = casos.crear.ejecutar(operador, solicitud({ vigenteDesde: '2026-03-05' }));

    await expect(nueva).rejects.toThrow(VigenciaDeCombustibleEnUso);
  });

  it('valida los datos en el dominio', async () => {
    const invalida = casos.crear.ejecutar(operador, solicitud({ idpPorGalon: '-1' }));

    await expect(invalida).rejects.toThrow(VigenciaDeCombustibleInvalido);
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });
});

describe('cambiar una vigencia', () => {
  it('cambiar la tasa de una vigencia sin uso queda auditado como corrección, con cómo estaba', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const cambiado = await casos.actualizar.ejecutar(operador, {
      vigenciaDeCombustibleId: creado.id,
      solicitud: solicitud({ idpPorGalon: '4.90' }),
    });

    expect(cambiado.idpPorGalon).toBe('4.90');
    expect(auditoria.entradas).toEqual([
      {
        recurso: 'libro-de-compras.vigencias-de-combustible',
        registroId: creado.id,
        accion: 'corregir',
        anterior: creado,
      },
    ]);
    expect(registros.bloqueos).toEqual([COMBUSTIBLE, COMBUSTIBLE]);
  });

  it('guardar sin cambiar nada no audita', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    await casos.actualizar.ejecutar(operador, { vigenciaDeCombustibleId: creado.id, solicitud: solicitud() });

    expect(auditoria.entradas).toEqual([]);
  });

  it('una vigencia usada conserva su tasa, pero puede cerrarse en o después de su última emisión', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());
    registros.marcarEnUso(creado.id, '2026-02-15');
    const cambio = (cambios: Partial<SolicitudDeVigenciaDeCombustible>) =>
      casos.actualizar.ejecutar(operador, {
        vigenciaDeCombustibleId: creado.id,
        solicitud: solicitud(cambios),
      });

    await expect(cambio({ idpPorGalon: '9.00' })).rejects.toThrow(VigenciaDeCombustibleEnUso);
    await expect(cambio({ vigenteHasta: '2026-02-14' })).rejects.toThrow(VigenciaDeCombustibleEnUso);
    expect((await cambio({ vigenteHasta: '2026-02-15' })).vigenteHasta).toBe('2026-02-15');
  });

  it('no cambia de combustible', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const cambio = casos.actualizar.ejecutar(operador, {
      vigenciaDeCombustibleId: creado.id,
      solicitud: solicitud({ combustibleId: OTRO_COMBUSTIBLE }),
    });

    await expect(cambio).rejects.toThrow(VigenciaDeCombustibleInvalido);
  });
});

describe('eliminar una vigencia', () => {
  it('elimina una vigencia sin uso y queda en la auditoría', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    await casos.eliminar.ejecutar(operador, creado.id);

    expect(await casos.listar.ejecutar(operador)).toEqual([]);
    expect(auditoria.entradas).toEqual([
      {
        recurso: 'libro-de-compras.vigencias-de-combustible',
        registroId: creado.id,
        accion: 'eliminar',
        anterior: creado,
      },
    ]);
  });

  it('una vigencia usada por documentos no se elimina', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());
    registros.marcarEnUso(creado.id, '2026-02-15');

    await expect(casos.eliminar.ejecutar(operador, creado.id)).rejects.toThrow(RecursoEnUso);
    expect(await casos.listar.ejecutar(operador)).toEqual([creado]);
    expect(auditoria.entradas).toEqual([]);
  });
});
