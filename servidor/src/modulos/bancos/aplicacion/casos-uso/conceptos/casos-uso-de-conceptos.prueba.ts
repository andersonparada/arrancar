import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { ConceptoInvalido } from '../../../dominio/concepto.js';
import { CONCEPTOS_INICIALES } from '../../../dominio/conceptos-iniciales.js';
import { ConceptoDeSistema, ConceptoEnUso } from '../../../dominio/errores-de-conceptos.js';
import { ConceptosEnMemoria } from '../../../pruebas/dobles-de-conceptos.js';
import type { SolicitudDeConcepto } from '../../dto/concepto.dto.js';
import { ActualizarConcepto } from './actualizar-concepto.js';
import { CrearConcepto } from './crear-concepto.js';
import { EliminarConcepto } from './eliminar-concepto.js';
import { ListarConceptos } from './listar-conceptos.js';
import { ObtenerConcepto } from './obtener-concepto.js';

const operador = operadorDePrueba();

const solicitud = (cambios: Partial<SolicitudDeConcepto> = {}): SolicitudDeConcepto => ({
  nombre: 'Registro de prueba',
  aplicaA: 'credito',
  actividadDeFlujo: 'operacion',
  grupoDeFlujo: 'Registro de prueba',
  esCargoBancario: false,
  pideDatosDeIntereses: false,
  admiteFactura: false,
  activo: true,
  ...cambios,
});

let auditoria: AuditoriaEnMemoria;
let registros: ConceptosEnMemoria;

function casosDeUso() {
  registros = new ConceptosEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    auditoria,
  };
  return {
    listar: new ListarConceptos(dependencias),
    obtener: new ObtenerConcepto(dependencias),
    crear: new CrearConcepto(dependencias),
    actualizar: new ActualizarConcepto(dependencias),
    eliminar: new EliminarConcepto(dependencias),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

async function conceptoDeSistema() {
  const lista = await casos.listar.ejecutar(operador);
  return lista.find((c) => c.claveDeSistema === 'transferencia')!;
}

describe('conceptos', () => {
  it('la primera vez que se abre el catálogo se siembra, y solo esa vez', async () => {
    const primera = await casos.listar.ejecutar(operador);
    const segunda = await casos.listar.ejecutar(operador);

    expect(primera).toHaveLength(CONCEPTOS_INICIALES.length);
    expect(segunda).toEqual(primera);
    expect(primera.filter((c) => c.claveDeSistema)).toHaveLength(5);
    expect(primera.every((c) => !c.admiteFactura)).toBe(true);
  });

  it('registrar en una empresa sin catálogo también lo siembra antes', async () => {
    await casos.crear.ejecutar(operador, solicitud());

    expect(await registros.listar()).toHaveLength(CONCEPTOS_INICIALES.length + 1);
  });

  it('registra un concepto propio, sin clave de sistema', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    expect(creado.claveDeSistema).toBeNull();
    expect(await casos.obtener.ejecutar(operador, creado.id)).toEqual(creado);
  });

  it('cambia sus datos y deja en blanco el grupo si se escribe vacío', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const cambiado = await casos.actualizar.ejecutar(operador, {
      conceptoId: creado.id,
      solicitud: solicitud({ nombre: ' Registro cambiado ', grupoDeFlujo: '  ' }),
    });

    expect(cambiado.nombre).toBe('Registro cambiado');
    expect(cambiado.grupoDeFlujo).toBeNull();
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });

  it('no se registra sin "Nombre"', async () => {
    const invalido = casos.crear.ejecutar(operador, solicitud({ nombre: '  ' }));

    await expect(invalido).rejects.toThrow(ConceptoInvalido);
  });

  it('los datos de intereses solo se piden en notas de crédito o en ambas', async () => {
    const enDebito = casos.crear.ejecutar(operador, solicitud({ aplicaA: 'debito', pideDatosDeIntereses: true }));
    const enAmbas = await casos.crear.ejecutar(operador, solicitud({ aplicaA: 'ambos', pideDatosDeIntereses: true }));

    await expect(enDebito).rejects.toThrow(ConceptoInvalido);
    expect(enAmbas.pideDatosDeIntereses).toBe(true);
  });

  it('se inactiva sin perder sus datos y deja rastro', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const inactivo = await casos.actualizar.ejecutar(operador, {
      conceptoId: creado.id,
      solicitud: solicitud({ activo: false }),
    });

    expect(inactivo).toEqual({ ...creado, activo: false });
    expect(auditoria.acciones()).toEqual(['bancos.conceptos:inactivar']);
  });

  it('un concepto de sistema no se edita, inactiva ni elimina', async () => {
    const delSistema = await conceptoDeSistema();

    const editar = casos.actualizar.ejecutar(operador, { conceptoId: delSistema.id, solicitud: solicitud() });
    const inactivar = casos.actualizar.ejecutar(operador, {
      conceptoId: delSistema.id,
      solicitud: { ...delSistema, activo: false },
    });
    const eliminar = casos.eliminar.ejecutar(operador, { conceptoId: delSistema.id, motivo: 'x' });

    await expect(editar).rejects.toThrow(ConceptoDeSistema);
    await expect(inactivar).rejects.toThrow(ConceptoDeSistema);
    await expect(eliminar).rejects.toThrow(ConceptoDeSistema);
    expect(auditoria.acciones()).toEqual([]);
  });

  it('elimina un concepto que nadie usa y deja rastro con su motivo', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    await casos.eliminar.ejecutar(operador, { conceptoId: creado.id, motivo: 'Duplicado' });

    await expect(casos.obtener.ejecutar(operador, creado.id)).rejects.toThrow(RecursoNoEncontrado);
    expect(auditoria.acciones()).toEqual(['bancos.conceptos:eliminar']);
  });

  it('no elimina uno que ya clasifica notas o cheques: se inactiva', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());
    registros.enUso.add(creado.id);

    const eliminar = casos.eliminar.ejecutar(operador, { conceptoId: creado.id, motivo: 'x' });

    await expect(eliminar).rejects.toThrow(ConceptoEnUso);
    expect(await casos.obtener.ejecutar(operador, creado.id)).toEqual(creado);
    expect(auditoria.acciones()).toEqual([]);
  });
});
