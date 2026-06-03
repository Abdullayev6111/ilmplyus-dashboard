import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

/**
 * Reusable hook for CREATE operations.
 * @param mutationFn Function that performs the API call.
 * @param invalidateKeys Array of query keys to invalidate on success.
 */
export function useCreateMutation<TData = any, TError = Error, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidateKeys: string[][] = [],
): UseMutationResult<TData, TError, TVariables> {
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables>({
    mutationFn,
    onSuccess: () => {
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
}

/**
 * Reusable hook for UPDATE operations.
 * @param mutationFn Function that performs the API call.
 * @param invalidateKeys Array of query keys to invalidate on success.
 */
export function useUpdateMutation<TData = any, TError = Error, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidateKeys: string[][] = [],
): UseMutationResult<TData, TError, TVariables> {
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables>({
    mutationFn,
    onSuccess: () => {
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
}

/**
 * Reusable hook for DELETE operations.
 * @param mutationFn Function that performs the API call.
 * @param invalidateKeys Array of query keys to invalidate on success.
 */
export function useDeleteMutation<TData = any, TError = Error, TVariables = number | string>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidateKeys: string[][] = [],
): UseMutationResult<TData, TError, TVariables> {
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables>({
    mutationFn,
    onSuccess: () => {
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
}
