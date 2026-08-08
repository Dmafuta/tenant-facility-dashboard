import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listOnboarding } from '@/lib/api/onboarding'
import { listLeave } from '@/lib/api/leave'
import { listStaffDocs } from '@/lib/api/staffdocs'
import { listRoster } from '@/lib/api/roster'
import { listDisciplinary } from '@/lib/api/disciplinary'
import { listTraining } from '@/lib/api/training'
import { listPayroll } from '@/lib/api/payroll'
import { queryKeys } from './keys'

export function useOnboarding() {
  return useQuery({
    queryKey: queryKeys.hr.onboarding(),
    queryFn: () => listOnboarding(),
  })
}

export function useLeave() {
  return useQuery({
    queryKey: queryKeys.hr.leave(),
    queryFn: () => listLeave(),
  })
}

export function useStaffDocs() {
  return useQuery({
    queryKey: queryKeys.hr.staffDocs(),
    queryFn: () => listStaffDocs(),
  })
}

export function useRoster(from: string, to: string, dept: string) {
  return useQuery({
    queryKey: queryKeys.hr.roster(from, to, dept),
    queryFn: () => listRoster({ from, to, department: dept || undefined }),
    placeholderData: (prev) => prev,
  })
}

export function useDisciplinary() {
  return useQuery({
    queryKey: queryKeys.hr.disciplinary(),
    queryFn: () => listDisciplinary(),
  })
}

export function useTraining() {
  return useQuery({
    queryKey: queryKeys.hr.training(),
    queryFn: () => listTraining(),
  })
}

export function usePayroll(month: string) {
  return useQuery({
    queryKey: queryKeys.hr.payroll(month),
    queryFn: () => listPayroll({ month }),
    placeholderData: (prev) => prev,
  })
}

export function useInvalidateOnboarding() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.hr.onboarding() })
}

export function useInvalidateLeave() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.hr.leave() })
}

export function useInvalidateStaffDocs() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.hr.staffDocs() })
}

export function useInvalidateRoster(from: string, to: string, dept: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.hr.roster(from, to, dept) })
}

export function useInvalidateDisciplinary() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.hr.disciplinary() })
}

export function useInvalidateTraining() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.hr.training() })
}

export function useInvalidatePayroll(month: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.hr.payroll(month) })
}
