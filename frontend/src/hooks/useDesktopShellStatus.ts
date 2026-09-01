import { useMemo } from "react";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";

type MutationLike = Pick<UseMutationResult<unknown, Error, unknown, unknown>, "error" | "isPending">;
type QueryLike = Pick<UseQueryResult<unknown, Error>, "error" | "isPending">;

type UseDesktopShellStatusParams = {
  createNoteMutation: MutationLike;
  deleteNoteMutation: MutationLike;
  isGraphRefreshLoading: boolean;
  isSelectionLoading: boolean;
  renameNoteMutation: MutationLike;
  savePageMutation: MutationLike;
  selectionErrorMessage: string;
  selectionNoticeMessage: string;
  startupQueries: [QueryLike, QueryLike];
};

export function useDesktopShellStatus({
  createNoteMutation,
  deleteNoteMutation,
  isGraphRefreshLoading,
  isSelectionLoading,
  renameNoteMutation,
  savePageMutation,
  selectionErrorMessage,
  selectionNoticeMessage,
  startupQueries,
}: UseDesktopShellStatusParams) {
  const [bridgeBaseUrlQuery, bootstrapQuery] = startupQueries;

  const searchItems = useMemo(() => [], []);

  const isLoading =
    bridgeBaseUrlQuery.isPending ||
    bootstrapQuery.isPending ||
    isSelectionLoading;

  const isGraphRefreshing = isGraphRefreshLoading;

  const isSubmitting =
    createNoteMutation.isPending ||
    renameNoteMutation.isPending ||
    deleteNoteMutation.isPending;

  const isSavingPage = savePageMutation.isPending;

  const asyncError =
    bridgeBaseUrlQuery.error ||
    bootstrapQuery.error ||
    createNoteMutation.error ||
    renameNoteMutation.error ||
    deleteNoteMutation.error ||
    savePageMutation.error ||
    null;

  const errorMessage =
    selectionErrorMessage ||
    (asyncError instanceof Error
      ? asyncError.message
      : asyncError
        ? "Desktop bridge failed to load."
        : "");

  return {
    errorMessage,
    isGraphRefreshing,
    isLoading,
    isSavingPage,
    isSubmitting,
    noticeMessage: selectionNoticeMessage,
    searchItems,
  };
}
