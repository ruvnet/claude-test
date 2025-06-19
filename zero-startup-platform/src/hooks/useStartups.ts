import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../config/supabase'
import type { Startup, StartupStage } from '../types'

export const useStartups = (organizationId?: string) => {
  return useQuery({
    queryKey: ['startups', organizationId],
    queryFn: async () => {
      const query = supabase
        .from('startups')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (organizationId) {
        query.eq('organization_id', organizationId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      return data.map((item: Record<string, unknown>) => ({
        id: item.id,
        organizationId: item.organization_id,
        name: item.name,
        description: item.description,
        industry: item.industry,
        stage: item.stage as StartupStage,
        logoUrl: item.logo_url,
        website: item.website,
        metadata: item.metadata || {},
        createdAt: new Date(item.created_at as string),
        updatedAt: new Date(item.updated_at as string),
      })) as Startup[]
    },
    enabled: !!organizationId,
  })
}

export const useCreateStartup = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (startup: Omit<Startup, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('startups')
        .insert({
          organization_id: startup.organizationId,
          name: startup.name,
          description: startup.description,
          industry: startup.industry,
          stage: startup.stage,
          logo_url: startup.logoUrl,
          website: startup.website,
          metadata: startup.metadata,
        })
        .select()
        .single()
      
      if (error) throw error
      
      return {
        id: data.id,
        organizationId: data.organization_id,
        name: data.name,
        description: data.description,
        industry: data.industry,
        stage: data.stage as StartupStage,
        logoUrl: data.logo_url,
        website: data.website,
        metadata: data.metadata || {},
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      } as Startup
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['startups'] })
    },
  })
}

export const useUpdateStartup = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Startup> }) => {
      const updateData: Record<string, unknown> = {}
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.industry !== undefined) updateData.industry = updates.industry
      if (updates.stage !== undefined) updateData.stage = updates.stage
      if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl
      if (updates.website !== undefined) updateData.website = updates.website
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata
      
      const { data, error } = await supabase
        .from('startups')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      
      return {
        id: data.id,
        organizationId: data.organization_id,
        name: data.name,
        description: data.description,
        industry: data.industry,
        stage: data.stage as StartupStage,
        logoUrl: data.logo_url,
        website: data.website,
        metadata: data.metadata || {},
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      } as Startup
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['startups'] })
      queryClient.invalidateQueries({ queryKey: ['startup', data.id] })
    },
  })
}