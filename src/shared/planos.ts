// Planos do Easy Read. O pagamento é só uma simulação: escolher um plano não cobra nada.
import type { PlanoId } from '../types/index';

export interface Plano {
  id: PlanoId;
  nome: string;
  precoMensal: number; // em reais; 0 = grátis
  revisoesPorDia: number; // revisões novas (resumo + quiz) que a IA gera por dia
  descricao: string;
  vantagens: string[];
  destaque?: boolean;
}

export const PLANOS: Plano[] = [
  {
    id: 'gratis',
    nome: 'Grátis',
    precoMensal: 0,
    revisoesPorDia: 3,
    descricao: 'Para conhecer o Easy Read.',
    vantagens: [
      'Todos os livros da biblioteca',
      'Leitura offline',
      '3 revisões com IA por dia',
      'Histórico de revisões e notas',
    ],
  },
  {
    id: 'leitor',
    nome: 'Leitor',
    precoMensal: 9.9,
    revisoesPorDia: 15,
    descricao: 'Para quem estuda toda semana.',
    vantagens: [
      'Tudo do plano Grátis',
      '15 revisões com IA por dia',
      'Novas perguntas para o mesmo trecho',
    ],
    destaque: true,
  },
  {
    id: 'premium',
    nome: 'Premium',
    precoMensal: 19.9,
    revisoesPorDia: 40,
    descricao: 'Para maratonas de estudo.',
    vantagens: [
      'Tudo do plano Leitor',
      '40 revisões com IA por dia',
      'Prioridade para novos livros',
    ],
  },
];

export function buscarPlano(id: PlanoId | undefined): Plano {
  return PLANOS.find((p) => p.id === id) ?? PLANOS[0];
}

export function formatarPreco(valor: number): string {
  return valor === 0
    ? 'Grátis'
    : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
