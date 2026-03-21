import { Regla, Operador } from '@prisma/client';
import prisma from '../lib/prisma.js';

// Cache: unidadProduccionId -> rules for that unit
const rulesCache = new Map<string, (Regla & { unidadProduccion: { nombre: string } })[]>();

// Cooldown: reglaId -> last alert creation time
const lastAlertTime = new Map<string, Date>();

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// Operator labels for alert messages
const operadorLabels: Record<Operador, string> = {
  MAYOR_QUE: 'supera el limite de',
  MENOR_QUE: 'esta por debajo del limite de',
  IGUAL_A: 'es igual a',
  DIFERENTE_DE: 'es diferente de',
  FUERA_DE_RANGO: 'esta fuera de rango de',
};

export async function initRuleEngine(): Promise<void> {
  const reglas = await prisma.regla.findMany({
    where: { activa: true },
    include: {
      unidadProduccion: { select: { id: true, nombre: true } },
    },
  });

  rulesCache.clear();

  for (const regla of reglas) {
    const unitId = regla.unidadProduccionId;
    if (!rulesCache.has(unitId)) {
      rulesCache.set(unitId, []);
    }
    rulesCache.get(unitId)!.push(regla);
  }

  console.log(`[Rule Engine] Initialized with ${reglas.length} active rules for ${rulesCache.size} units`);
}

export async function evaluateRules(unidadId: string, valores: Record<string, unknown>): Promise<void> {
  const rules = rulesCache.get(unidadId);
  if (!rules || rules.length === 0) return;

  for (const rule of rules) {
    try {
      // Extract variable value from readings
      const value = valores[rule.variable];
      if (value === undefined || value === null) continue;
      if (typeof value !== 'number') continue;

      // Determine threshold
      const threshold = await resolveThreshold(rule, valores, unidadId);
      if (threshold === null) continue;

      // Evaluate operator
      const triggered = evaluateOperator(rule.operador, value, threshold, rule.toleranciaPorcentaje);
      if (!triggered) continue;

      // Check cooldown
      if (await isInCooldown(rule.id)) continue;

      // Generate alert message
      const unitName = rule.unidadProduccion.nombre;
      const mensaje = buildAlertMessage(rule.variable, value, threshold, rule.operador, unitName);

      // Create alert
      await prisma.alerta.create({
        data: {
          unidadProduccionId: unidadId,
          reglaId: rule.id,
          mensaje,
          severidad: rule.severidad,
          contexto: {
            variable: rule.variable,
            valor: value,
            umbral: threshold,
            operador: rule.operador,
          },
          resuelta: false,
        },
      });

      lastAlertTime.set(rule.id, new Date());
      console.log(`[Rule Engine] Alert created: ${mensaje}`);
    } catch (err) {
      console.error(`[Rule Engine] Error evaluating rule ${rule.id}:`, err);
    }
  }
}

async function resolveThreshold(
  rule: Regla,
  valores: Record<string, unknown>,
  unidadId: string,
): Promise<number | null> {
  // Priority: valorFijo > compararCon > codigoEspecificacion
  if (rule.valorFijo !== null && rule.valorFijo !== undefined) {
    return rule.valorFijo;
  }

  if (rule.compararCon) {
    const compValue = valores[rule.compararCon];
    if (typeof compValue === 'number') return compValue;
    return null;
  }

  if (rule.codigoEspecificacion) {
    // Look up from equipment specs for this production unit
    const equipos = await prisma.equipo.findMany({
      where: { unidadProduccionId: unidadId },
      select: { especificaciones: true },
    });

    for (const equipo of equipos) {
      const specs = equipo.especificaciones as Record<string, unknown> | null;
      if (specs && typeof specs[rule.codigoEspecificacion] === 'number') {
        return specs[rule.codigoEspecificacion] as number;
      }
    }
    return null;
  }

  return null;
}

function evaluateOperator(
  operador: Operador,
  value: number,
  threshold: number,
  tolerancia: number | null,
): boolean {
  switch (operador) {
    case 'MAYOR_QUE':
      return value > threshold;
    case 'MENOR_QUE':
      return value < threshold;
    case 'IGUAL_A':
      return value === threshold;
    case 'DIFERENTE_DE':
      return value !== threshold;
    case 'FUERA_DE_RANGO': {
      const pct = (tolerancia ?? 0) / 100;
      const lower = threshold * (1 - pct);
      const upper = threshold * (1 + pct);
      return value < lower || value > upper;
    }
    default:
      return false;
  }
}

async function isInCooldown(reglaId: string): Promise<boolean> {
  // Fast check from in-memory cache
  const cached = lastAlertTime.get(reglaId);
  if (cached && Date.now() - cached.getTime() < COOLDOWN_MS) {
    return true;
  }

  // Verify against DB: look for an unresolved alert created < 5 min ago
  const cutoff = new Date(Date.now() - COOLDOWN_MS);
  const recent = await prisma.alerta.findFirst({
    where: {
      reglaId,
      resuelta: false,
      creadaEn: { gte: cutoff },
    },
    select: { id: true, creadaEn: true },
  });

  if (recent) {
    lastAlertTime.set(reglaId, recent.creadaEn);
    return true;
  }

  return false;
}

function buildAlertMessage(
  variable: string,
  value: number,
  threshold: number,
  operador: Operador,
  unitName: string,
): string {
  const label = operadorLabels[operador];
  return `${variable} (${value}) ${label} ${threshold} en ${unitName}`;
}

export async function reloadRulesForUnit(unidadId: string): Promise<void> {
  const reglas = await prisma.regla.findMany({
    where: { unidadProduccionId: unidadId, activa: true },
    include: {
      unidadProduccion: { select: { id: true, nombre: true } },
    },
  });

  if (reglas.length > 0) {
    rulesCache.set(unidadId, reglas);
  } else {
    rulesCache.delete(unidadId);
  }

  console.log(`[Rule Engine] Reloaded ${reglas.length} rules for unit ${unidadId}`);
}
