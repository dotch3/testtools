import { prisma } from "../infrastructure/database/prisma.js"

export interface CreateHeuristicData {
  name: string
  description?: string
  template: string
  elements?: {
    risk?: boolean
    coverage?: boolean
    time?: boolean
    style?: boolean
  }
  examples?: Array<{ charter: string; description?: string }>
}

export interface UpdateHeuristicData {
  name?: string
  description?: string
  template?: string
  elements?: {
    risk?: boolean
    coverage?: boolean
    time?: boolean
    style?: boolean
  }
  examples?: Array<{ charter: string; description?: string }>
}

export interface CreatePersonaData {
  heuristicId: string
  name: string
  description?: string
  characteristics?: string[]
}

export interface UpdatePersonaData {
  name?: string
  description?: string
  characteristics?: string[]
}

export class HeuristicService {
  async findAll() {
    return prisma.heuristic.findMany({
      include: {
        personas: true,
        _count: {
          select: { linkedCharters: true },
        },
      },
      orderBy: { name: "asc" },
    })
  }

  async findById(id: string) {
    return prisma.heuristic.findUnique({
      where: { id },
      include: {
        personas: true,
        _count: {
          select: { linkedCharters: true },
        },
      },
    })
  }

  async create(data: CreateHeuristicData) {
    return prisma.heuristic.create({
      data: {
        name: data.name,
        description: data.description,
        template: data.template,
        elements: data.elements || {},
        examples: data.examples || [],
      },
      include: {
        personas: true,
      },
    })
  }

  async update(id: string, data: UpdateHeuristicData) {
    return prisma.heuristic.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.template !== undefined && { template: data.template }),
        ...(data.elements !== undefined && { elements: data.elements }),
        ...(data.examples !== undefined && { examples: data.examples }),
      },
      include: {
        personas: true,
      },
    })
  }

  async delete(id: string) {
    await prisma.heuristic.delete({ where: { id } })
  }

  async addPersona(data: CreatePersonaData) {
    return prisma.persona.create({
      data: {
        heuristicId: data.heuristicId,
        name: data.name,
        description: data.description,
        characteristics: data.characteristics || [],
      },
    })
  }

  async updatePersona(id: string, data: UpdatePersonaData) {
    return prisma.persona.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.characteristics !== undefined && { characteristics: data.characteristics }),
      },
    })
  }

  async deletePersona(id: string) {
    await prisma.persona.delete({ where: { id } })
  }

  async getPersonasByHeuristic(heuristicId: string) {
    return prisma.persona.findMany({
      where: { heuristicId },
      orderBy: { name: "asc" },
    })
  }

  async linkToCharter(charterId: string, heuristicId: string) {
    return prisma.eTCharterHeuristic.create({
      data: {
        etCharterId: charterId,
        heuristicId,
      },
    })
  }

  async unlinkFromCharter(charterId: string, heuristicId: string) {
    await prisma.eTCharterHeuristic.delete({
      where: {
        etCharterId_heuristicId: {
          etCharterId: charterId,
          heuristicId,
        },
      },
    })
  }

  async getByCharter(charterId: string) {
    return prisma.eTCharterHeuristic.findMany({
      where: { etCharterId: charterId },
      include: {
        heuristic: {
          include: {
            personas: true,
          },
        },
      },
    })
  }
}

export const heuristicService = new HeuristicService()
