import { TipoVariable, VariableDefinicion } from '@prisma/client';
import { Parser } from 'expr-eval';
import prisma from '../lib/prisma.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CachedDefinitions {
  sensor: VariableDefinicion[];
  fija: VariableDefinicion[];
  calculada: VariableDefinicion[]; // topologically sorted by formula dependencies
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const definitionsCache = new Map<string, CachedDefinitions>();
const parser = new Parser();

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

export async function initFormulaEngine(): Promise<void> {
  const allDefs = await prisma.variableDefinicion.findMany();

  // Group by tipoUnidadProduccionId
  const grouped = new Map<string, VariableDefinicion[]>();
  for (const def of allDefs) {
    const list = grouped.get(def.tipoUnidadProduccionId) ?? [];
    list.push(def);
    grouped.set(def.tipoUnidadProduccionId, list);
  }

  definitionsCache.clear();

  for (const [tipoId, defs] of grouped) {
    cacheDefinitions(tipoId, defs);
  }

  console.log(
    `[Formula Engine] Initialized with ${allDefs.length} variable definitions across ${definitionsCache.size} unit types`,
  );
}

// ---------------------------------------------------------------------------
// Main computation
// ---------------------------------------------------------------------------

export async function computeVariables(
  tipoUnidadProduccionId: string,
  sensorData: Record<string, unknown>,
  configuracion: Record<string, unknown>,
  unidadId: string,
  currentTimestamp: Date,
): Promise<Record<string, unknown>> {
  const cached = definitionsCache.get(tipoUnidadProduccionId);
  if (!cached) {
    return sensorData;
  }

  const context: Record<string, unknown> = {};

  // 1. Populate SENSOR variables
  for (const def of cached.sensor) {
    const key = def.claveJson ?? def.codigo;
    const raw = sensorData[key];
    context[def.codigo] = typeof raw === 'number' ? raw : 0;
  }

  // 2. Populate FIJA variables
  for (const def of cached.fija) {
    const cfgValue = configuracion[def.codigo];
    if (typeof cfgValue === 'number') {
      context[def.codigo] = cfgValue;
    } else {
      context[def.codigo] = def.valorPorDefecto ?? 0;
    }
  }

  // 3. Compute delta_t (available as a built-in variable for formulas)
  context['delta_t'] = await getDeltaT(unidadId, currentTimestamp);

  // 4. Evaluate CALCULADA variables (topologically sorted)
  for (const def of cached.calculada) {
    if (!def.formula) {
      context[def.codigo] = null;
      continue;
    }

    try {
      const expr = parser.parse(def.formula);
      // Build a numeric-only snapshot for expr-eval
      const evalContext: Record<string, number> = {};
      for (const [k, v] of Object.entries(context)) {
        evalContext[k] = typeof v === 'number' ? v : 0;
      }
      const result = expr.evaluate(evalContext);
      context[def.codigo] = typeof result === 'number'
        ? Math.round(result * 1000) / 1000
        : result;
    } catch (err) {
      console.error(
        `[Formula Engine] Error evaluating formula "${def.formula}" for variable "${def.codigo}":`,
        err,
      );
      context[def.codigo] = null;
    }
  }

  return context;
}

// ---------------------------------------------------------------------------
// Cache management
// ---------------------------------------------------------------------------

export async function reloadDefinitionsForType(tipoId: string): Promise<void> {
  const defs = await prisma.variableDefinicion.findMany({
    where: { tipoUnidadProduccionId: tipoId },
  });

  if (defs.length > 0) {
    cacheDefinitions(tipoId, defs);
  } else {
    definitionsCache.delete(tipoId);
  }

  console.log(
    `[Formula Engine] Reloaded ${defs.length} definitions for type ${tipoId}`,
  );
}

function cacheDefinitions(tipoId: string, defs: VariableDefinicion[]): void {
  const sensor = defs.filter((d) => d.tipo === TipoVariable.SENSOR);
  const fija = defs.filter((d) => d.tipo === TipoVariable.FIJA);
  const calculadaRaw = defs.filter((d) => d.tipo === TipoVariable.CALCULADA);

  // Collect all known codigos so the topological sort only tracks internal deps
  const allCodigos = new Set(defs.map((d) => d.codigo));

  const calculada = topologicalSort(calculadaRaw, allCodigos);

  definitionsCache.set(tipoId, { sensor, fija, calculada });
}

// ---------------------------------------------------------------------------
// Topological sort
// ---------------------------------------------------------------------------

function topologicalSort(
  variables: VariableDefinicion[],
  allCodigos: Set<string>,
): VariableDefinicion[] {
  if (variables.length === 0) return [];

  // Build a map from codigo -> VariableDefinicion
  const byCode = new Map<string, VariableDefinicion>();
  for (const v of variables) {
    byCode.set(v.codigo, v);
  }

  // Build adjacency list: codigo -> set of codigos it depends on
  const deps = new Map<string, Set<string>>();
  for (const v of variables) {
    const refs = extractReferences(v.formula ?? '', allCodigos);
    // Only keep references that are themselves CALCULADA variables in this batch
    const calcDeps = new Set<string>();
    for (const ref of refs) {
      if (byCode.has(ref) && ref !== v.codigo) {
        calcDeps.add(ref);
      }
    }
    deps.set(v.codigo, calcDeps);
  }

  // DFS-based topological sort
  const sorted: VariableDefinicion[] = [];
  const visited = new Set<string>(); // permanently marked
  const visiting = new Set<string>(); // temporarily marked (cycle detection)

  function visit(codigo: string): void {
    if (visited.has(codigo)) return;
    if (visiting.has(codigo)) {
      throw new Error(
        `[Formula Engine] Circular dependency detected involving variable "${codigo}"`,
      );
    }

    visiting.add(codigo);

    const varDeps = deps.get(codigo);
    if (varDeps) {
      for (const dep of varDeps) {
        visit(dep);
      }
    }

    visiting.delete(codigo);
    visited.add(codigo);

    const def = byCode.get(codigo);
    if (def) {
      sorted.push(def);
    }
  }

  for (const v of variables) {
    visit(v.codigo);
  }

  return sorted;
}

/**
 * Extract variable references from a formula string by tokenizing and
 * matching word tokens against known variable codigos.
 */
function extractReferences(formula: string, allCodigos: Set<string>): Set<string> {
  const refs = new Set<string>();
  // Match word-like tokens (identifiers): sequences of letters, digits, underscores
  const tokens = formula.match(/[a-zA-Z_]\w*/g) ?? [];
  for (const token of tokens) {
    if (allCodigos.has(token)) {
      refs.add(token);
    }
  }
  return refs;
}

// ---------------------------------------------------------------------------
// delta_t helper
// ---------------------------------------------------------------------------

async function getDeltaT(unidadId: string, currentTimestamp: Date): Promise<number> {
  const prev = await prisma.lectura.findFirst({
    where: { unidadProduccionId: unidadId },
    orderBy: { timestamp: 'desc' },
    select: { timestamp: true },
  });
  if (!prev) return 0;
  return (currentTimestamp.getTime() - prev.timestamp.getTime()) / 1000;
}

// ---------------------------------------------------------------------------
// Formula validation (for admin API)
// ---------------------------------------------------------------------------

export function validateFormula(
  formula: string,
  availableCodigos: string[],
): { valid: boolean; error?: string; references: string[] } {
  try {
    parser.parse(formula);
  } catch (err) {
    return {
      valid: false,
      error: `Invalid formula syntax: ${err instanceof Error ? err.message : String(err)}`,
      references: [],
    };
  }

  const knownCodigos = new Set(availableCodigos);
  const refs = extractReferences(formula, knownCodigos);

  // Also find any word tokens that look like variable references but are not in the known list
  // (exclude expr-eval built-in functions)
  const builtIns = new Set([
    'sqrt', 'abs', 'ceil', 'floor', 'round', 'trunc', 'log', 'log2', 'log10',
    'exp', 'pow', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
    'min', 'max', 'hypot', 'sign', 'cbrt', 'expm1', 'log1p',
    'PI', 'E', 'true', 'false',
    'random', 'fac', 'length', 'not', 'and', 'or', 'if',
  ]);

  const allTokens = formula.match(/[a-zA-Z_]\w*/g) ?? [];
  const unknownRefs: string[] = [];
  for (const token of allTokens) {
    if (!knownCodigos.has(token) && !builtIns.has(token)) {
      unknownRefs.push(token);
    }
  }

  if (unknownRefs.length > 0) {
    return {
      valid: false,
      error: `Unknown variable(s) referenced: ${[...new Set(unknownRefs)].join(', ')}`,
      references: [...refs],
    };
  }

  return {
    valid: true,
    references: [...refs],
  };
}
