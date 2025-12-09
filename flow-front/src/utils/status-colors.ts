/**
 * Sistema de cores dinâmico para status de tarefas
 * Gera cores únicas e consistentes para cada status
 */

export interface StatusColors {
  bg: string;
  text: string;
  border: string;
  bgSolid: string;
  gradient: string;
}

// Paleta de cores moderna e vibrante
const COLOR_PALETTE = [
  // Azul (padrão para "A Fazer")
  {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    bgSolid: 'bg-blue-500',
    gradient: 'from-blue-500 to-blue-600',
  },
  // Âmbar (padrão para "Em Progresso")
  {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    bgSolid: 'bg-amber-500',
    gradient: 'from-amber-500 to-orange-500',
  },
  // Vermelho (padrão para "Bloqueado")
  {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    bgSolid: 'bg-red-500',
    gradient: 'from-red-500 to-rose-500',
  },
  // Verde (padrão para "Concluído")
  {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    bgSolid: 'bg-emerald-500',
    gradient: 'from-emerald-500 to-green-500',
  },
  // Roxo
  {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    bgSolid: 'bg-violet-500',
    gradient: 'from-violet-500 to-purple-500',
  },
  // Índigo
  {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    bgSolid: 'bg-indigo-500',
    gradient: 'from-indigo-500 to-blue-500',
  },
  // Rosa
  {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200',
    bgSolid: 'bg-pink-500',
    gradient: 'from-pink-500 to-rose-500',
  },
  // Ciano
  {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    bgSolid: 'bg-cyan-500',
    gradient: 'from-cyan-500 to-teal-500',
  },
  // Teal
  {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    bgSolid: 'bg-teal-500',
    gradient: 'from-teal-500 to-emerald-500',
  },
  // Laranja
  {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    bgSolid: 'bg-orange-500',
    gradient: 'from-orange-500 to-amber-500',
  },
  // Lime
  {
    bg: 'bg-lime-50',
    text: 'text-lime-700',
    border: 'border-lime-200',
    bgSolid: 'bg-lime-500',
    gradient: 'from-lime-500 to-green-500',
  },
  // Fuchsia
  {
    bg: 'bg-fuchsia-50',
    text: 'text-fuchsia-700',
    border: 'border-fuchsia-200',
    bgSolid: 'bg-fuchsia-500',
    gradient: 'from-fuchsia-500 to-pink-500',
  },
];

// Mapeamento de códigos conhecidos para índices específicos
const KNOWN_STATUS_CODES: Record<string, number> = {
  'todo': 0,
  'a_fazer': 0,
  'in_progress': 1,
  'em_progresso': 1,
  'em_andamento': 1,
  'blocked': 2,
  'bloqueado': 2,
  'completed': 3,
  'concluido': 3,
  'done': 3,
};

// Cache para manter consistência das cores por ID
const colorCache = new Map<number, StatusColors>();

/**
 * Gera um hash simples a partir do ID para distribuir cores
 */
function hashId(id: number): number {
  // Usar o ID diretamente, começando após os status padrão
  return id;
}

/**
 * Obtém as cores para um status baseado no código ou ID
 * @param statusCode - Código do status (ex: 'todo', 'in_progress')
 * @param statusId - ID numérico do status
 * @param index - Índice opcional para fallback
 */
export function getStatusColors(
  statusCode?: string,
  statusId?: number,
  index?: number
): StatusColors {
  // Se tiver ID, verificar cache primeiro
  if (statusId !== undefined && colorCache.has(statusId)) {
    return colorCache.get(statusId)!;
  }

  let colorIndex: number;

  // Primeiro, tentar mapear por código conhecido
  if (statusCode) {
    const normalizedCode = statusCode.toLowerCase().replace(/\s+/g, '_');
    if (KNOWN_STATUS_CODES[normalizedCode] !== undefined) {
      colorIndex = KNOWN_STATUS_CODES[normalizedCode];
    } else if (statusId !== undefined) {
      // Para códigos desconhecidos, usar hash do ID
      // Começar após os 4 status padrão para garantir cores diferentes
      colorIndex = 4 + (hashId(statusId) % (COLOR_PALETTE.length - 4));
    } else if (index !== undefined) {
      colorIndex = index % COLOR_PALETTE.length;
    } else {
      colorIndex = 0;
    }
  } else if (statusId !== undefined) {
    colorIndex = hashId(statusId) % COLOR_PALETTE.length;
  } else if (index !== undefined) {
    colorIndex = index % COLOR_PALETTE.length;
  } else {
    colorIndex = 0;
  }

  const colors = COLOR_PALETTE[colorIndex];

  // Cachear resultado se tiver ID
  if (statusId !== undefined) {
    colorCache.set(statusId, colors);
  }

  return colors;
}

/**
 * Obtém cores para um objeto de status completo
 */
export function getStatusColorsFromEntity(
  status: { id?: number; code?: string },
  index?: number
): StatusColors {
  return getStatusColors(status.code, status.id, index);
}

/**
 * Limpa o cache de cores (útil ao trocar de projeto)
 */
export function clearStatusColorCache(): void {
  colorCache.clear();
}

/**
 * Obtém a paleta completa de cores disponíveis
 */
export function getColorPalette(): StatusColors[] {
  return [...COLOR_PALETTE];
}

/**
 * Obtém uma cor específica da paleta por índice
 */
export function getColorByIndex(index: number): StatusColors {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}
