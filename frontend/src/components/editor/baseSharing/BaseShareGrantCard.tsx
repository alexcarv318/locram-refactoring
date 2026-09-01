import type { ReactNode, Ref } from "react";

import {
  CircleCloseIcon,
  CopyIcon,
  CopySuccessIcon,
  DatabaseIcon,
  DeleteIcon,
  LinkBridgeIcon,
  NoteIcon,
} from "@/components/icons/Icons";
import {
  FileHomeDetailField,
  FileHomeSection,
  FileHomeSummaryGrid,
  FileHomeSummaryMetric,
  FILE_HOME_SUMMARY_GRID_CLASS,
  FileHomeManagementButton,
  formatFileHomeBytes,
  formatFileHomeTimestamp,
} from "@/components/editor/FileHomeBlocks";
import Input from "@/components/ui/Input";
import CopyableId from "@/components/ui/CopyableId";
import {
  BaseShareActivationStateBadge,
  BaseShareGrantStateBadge,
  shouldShowActivationStateBadge,
} from "@/lib/sharing/baseShareGrantUi";
import type { Translator } from "@/i18n/translate";
import { useUiPreferencesStore } from "@/stores/uiPreferencesStore";
import { cn } from "@/lib/utils/cn";
import type { BaseShareInvite, OwnerBaseShareManagementItem } from "@/types";

const GRANT_EMBEDDED_SECTION_CLASS = "rounded-none border-0 bg-transparent p-0";

const GRANT_DETAIL_IDENTITY_COLUMN_CLASS = "col-span-2 min-w-0 @max-[639px]:col-span-1";
const GRANT_DETAIL_META_COLUMN_CLASS = "min-w-0 @max-[639px]:col-span-1";

type GrantDetailIdentityField = {
  action?: ReactNode;
  label: string;
  mono?: boolean;
  value: string;
};

type GrantDetailMetaField = {
  label: string;
  value: string;
};

function GrantDetailIdentityFieldCard({ field }: { field: GrantDetailIdentityField }) {
  return (
    <FileHomeDetailField
      action={field.action}
      cardVariant="paired"
      label={field.label}
      mono={field.mono}
      value={field.value}
    />
  );
}

function GrantDetailMetaFieldCard({ field }: { field: GrantDetailMetaField }) {
  return (
    <FileHomeDetailField
      cardVariant="paired"
      label={field.label}
      value={field.value}
    />
  );
}

function GrantDetailMetricRow({
  identity,
  metaField,
}: {
  identity: GrantDetailIdentityField;
  metaField?: GrantDetailMetaField;
}) {
  return (
    <div className={cn(FILE_HOME_SUMMARY_GRID_CLASS, "items-start")}>
      <div className={GRANT_DETAIL_IDENTITY_COLUMN_CLASS}>
        <GrantDetailIdentityFieldCard field={identity} />
      </div>
      {metaField ? (
        <div className={GRANT_DETAIL_META_COLUMN_CLASS}>
          <GrantDetailMetaFieldCard field={metaField} />
        </div>
      ) : null}
    </div>
  );
}

type BaseShareGrantCardProps = {
  cardRef?: Ref<HTMLDivElement>;
  copiedActionId: string | null;
  grant: OwnerBaseShareManagementItem;
  highlighted: boolean;
  inviteLinkRef?: (element: HTMLDivElement | null) => void;
  inviteMessage: string;
  inviteOwnerDisplayName: string;
  isDeletePending: boolean;
  isRevokePending: boolean;
  onCopyInvite: () => void;
  onDelete: () => void;
  onInviteMessageChange: (value: string) => void;
  onInviteOwnerDisplayNameChange: (value: string) => void;
  onMintInvite: () => void;
  onRevoke: () => void;
  rowInvite: BaseShareInvite | null;
  shareDisabled: boolean;
  t: Translator;
};

export default function BaseShareGrantCard({
  cardRef,
  copiedActionId,
  grant,
  highlighted,
  inviteLinkRef,
  inviteMessage,
  inviteOwnerDisplayName,
  isDeletePending,
  isRevokePending,
  onCopyInvite,
  onDelete,
  onInviteMessageChange,
  onInviteOwnerDisplayNameChange,
  onMintInvite,
  onRevoke,
  rowInvite,
  shareDisabled,
  t,
}: BaseShareGrantCardProps) {
  const locale = useUiPreferencesStore((state) => state.locale);
  const notesValue =
    grant.base_stats?.active_page_count ?? grant.base_stats?.page_count ?? t("common.unavailable");
  const sizeMetric = (
    <FileHomeSummaryMetric
      detail={t("fileHome.metricDetail.sharedBaseSize")}
      icon={<DatabaseIcon className="h-4 w-4" />}
      label={t("fileHome.metric.size")}
      value={formatFileHomeBytes(grant.base_stats?.size_bytes, t)}
    />
  );

  function copyableIdentityAction(rawValue: string | null | undefined, label: string) {
    const copyValue = rawValue?.trim();
    if (!copyValue) {
      return undefined;
    }
    return (
      <CopyableId
        ariaLabel={t("common.copyAction", { label })}
        iconOnly
        title={t("common.copyAction", { label })}
        value={copyValue}
      />
    );
  }

  const detailIdentityFields = [
    {
      action: copyableIdentityAction(grant.base_id, t("fileHome.detail.baseId")),
      label: t("fileHome.detail.baseId"),
      mono: true,
      value: grant.base_id,
    },
    {
      action: copyableIdentityAction(grant.entry_id, t("fileHome.detail.entryId")),
      label: t("fileHome.detail.entryId"),
      mono: true,
      value: grant.entry_id ?? t("common.unavailable"),
    },
    {
      action: copyableIdentityAction(grant.grant_id, t("fileHome.detail.grantId")),
      label: t("fileHome.detail.grantId"),
      mono: true,
      value: grant.grant_id,
    },
    {
      action: copyableIdentityAction(
        grant.recipient_account_id ?? grant.recipient_actor_ref,
        t("fileHome.detail.recipient"),
      ),
      label: t("fileHome.detail.recipient"),
      mono: true,
      value: grant.recipient_account_id ?? grant.recipient_actor_ref,
    },
  ];

  const detailMetaFields = [
    {
      label: t("fileHome.detail.created"),
      value: grant.created_at
        ? formatFileHomeTimestamp(grant.created_at, t, locale)
        : t("common.unavailable"),
    },
    {
      label: t("fileHome.detail.activated"),
      value: grant.activated_at
        ? formatFileHomeTimestamp(grant.activated_at, t, locale)
        : t("common.unavailable"),
    },
    {
      label: t("fileHome.detail.expires"),
      value: grant.expires_at
        ? formatFileHomeTimestamp(grant.expires_at, t, locale)
        : t("fileHome.detail.openEnded"),
    },
    {
      label: t("fileHome.detail.access"),
      value: grant.permission.toUpperCase(),
    },
  ];

  return (
    <div
      ref={cardRef}
      className={cn(
        "rounded-xl border bg-muted/10 p-4 transition-all duration-300",
        highlighted
          ? "border-sky-500/60 ring-2 ring-sky-500/20 shadow-[0_0_0_1px_rgba(14,165,233,0.25)]"
          : "border-border",
      )}
    >
      <div className="flex flex-col gap-4">
        <div className={FILE_HOME_SUMMARY_GRID_CLASS}>
          <p className="text-foreground min-w-0 self-center truncate text-sm font-semibold">
            {grant.share_base_title ?? grant.base_id}
          </p>
          <div className="col-span-2 flex flex-wrap items-center justify-end gap-2 @max-[639px]:col-span-1 @max-[639px]:justify-start">
            <BaseShareGrantStateBadge grantState={grant.grant_state} t={t} />
            {shouldShowActivationStateBadge(grant.activation_state) ? (
              <BaseShareActivationStateBadge activationState={grant.activation_state} t={t} />
            ) : null}
          </div>
        </div>

        <div className={cn(FILE_HOME_SUMMARY_GRID_CLASS, "items-stretch")}>
          <div className="min-w-0 self-stretch @max-[639px]:hidden">
            <FileHomeDetailField
              className="min-h-[84px]"
              label={t("sharing.owner.grant.recipient")}
              uniformHeight
              value={grant.recipient_account_id ?? grant.recipient_actor_ref}
            />
          </div>
          <div className="flex min-h-[84px] flex-col justify-center gap-2 self-stretch">
            <FileHomeManagementButton
              className="w-full"
              disabled={shareDisabled}
              onClick={onMintInvite}
            >
              <LinkBridgeIcon className="h-4 w-4" />
              <span>{t("sharing.owner.action.mintInvite")}</span>
            </FileHomeManagementButton>
            <FileHomeManagementButton
              className="w-full"
              disabled={isRevokePending || grant.grant_state !== "active"}
              onClick={onRevoke}
            >
              <CircleCloseIcon className="h-4 w-4" />
              <span>{t("sharing.owner.action.revoke")}</span>
            </FileHomeManagementButton>
          </div>
          <div className="flex min-h-[84px] flex-col justify-center gap-2 self-stretch">
            <FileHomeManagementButton
              className="w-full"
              disabled={shareDisabled}
              onClick={onCopyInvite}
            >
              {copiedActionId === `invite_${grant.grant_id}` ? (
                <CopySuccessIcon className="h-4 w-4" />
              ) : (
                <CopyIcon className="h-4 w-4" />
              )}
              <span>{t("sharing.owner.action.copyInvite")}</span>
            </FileHomeManagementButton>
            <FileHomeManagementButton
              className="w-full"
              disabled={isDeletePending}
              onClick={onDelete}
            >
              <DeleteIcon className="h-4 w-4" />
              <span>{t("sharing.owner.action.deleteGrant")}</span>
            </FileHomeManagementButton>
          </div>
        </div>

        <div className={cn(FILE_HOME_SUMMARY_GRID_CLASS, "hidden items-stretch @max-[639px]:grid")}>
          <FileHomeDetailField
            className="min-h-[84px]"
            label={t("sharing.owner.grant.recipient")}
            uniformHeight
            value={grant.recipient_account_id ?? grant.recipient_actor_ref}
          />
          {sizeMetric}
        </div>

        <FileHomeSummaryGrid>
          <FileHomeSummaryMetric
            detail={t("fileHome.metricDetail.notesInSharedBase")}
            icon={<NoteIcon className="h-4 w-4" />}
            label={t("fileHome.metric.notes")}
            value={String(notesValue)}
          />
          <FileHomeSummaryMetric
            detail={t("fileHome.metricDetail.edgesInSharedBase")}
            icon={<LinkBridgeIcon className="h-4 w-4" />}
            label={t("fileHome.metric.edges")}
            value={String(grant.base_stats?.link_count ?? t("common.unavailable"))}
          />
          <div className="min-w-0 @max-[639px]:hidden">
            {sizeMetric}
          </div>
        </FileHomeSummaryGrid>

        <div>
          <h3 className="text-foreground text-sm font-semibold">{t("fileHome.section.details")}</h3>
          <div className="mt-3 flex flex-col gap-2">
            <GrantDetailMetricRow
              identity={detailIdentityFields[0]}
              metaField={detailMetaFields[0]}
            />
            <GrantDetailMetricRow
              identity={detailIdentityFields[1]}
              metaField={detailMetaFields[1]}
            />
            <GrantDetailMetricRow
              identity={detailIdentityFields[2]}
              metaField={detailMetaFields[2]}
            />
            <GrantDetailMetricRow
              identity={detailIdentityFields[3]}
              metaField={detailMetaFields[3]}
            />
          </div>
        </div>

        <FileHomeSection
          className={GRANT_EMBEDDED_SECTION_CLASS}
          description={t("sharing.owner.inviteSection.description")}
          title={t("sharing.owner.inviteSection.title")}
        >
        <div className="space-y-2">
          <div className="relative min-w-0 rounded-lg border border-border bg-muted/20 px-3 py-2">
            <label
              className="text-muted-foreground block truncate text-[11px] uppercase leading-none tracking-wide"
              htmlFor={`invite-owner-${grant.grant_id}`}
            >
              {t("sharing.owner.field.ownerDisplayName")}
            </label>
            <Input
              id={`invite-owner-${grant.grant_id}`}
              aria-label={`${t("sharing.owner.field.ownerDisplayName")} ${grant.grant_id}`}
              className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              disabled={shareDisabled}
              onValueChange={onInviteOwnerDisplayNameChange}
              placeholder={t("sharing.owner.field.ownerDisplayNamePlaceholder")}
              value={inviteOwnerDisplayName}
            />
          </div>
          <div className="relative flex min-h-[114px] min-w-0 flex-col rounded-lg border border-border bg-muted/20 px-3 py-2">
            <label
              className="text-muted-foreground block truncate text-[11px] uppercase leading-none tracking-wide"
              htmlFor={`invite-message-${grant.grant_id}`}
            >
              {t("sharing.owner.field.inviteMessage")}
            </label>
            <textarea
              id={`invite-message-${grant.grant_id}`}
              aria-label={`${t("sharing.owner.field.inviteMessage")} ${grant.grant_id}`}
              className="text-foreground placeholder:text-muted-foreground mt-1 min-h-14 w-full flex-1 resize-none border-0 bg-transparent px-0 py-0 text-xs outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              disabled={shareDisabled}
              onChange={(event) => onInviteMessageChange(event.target.value)}
              placeholder={t("sharing.owner.field.inviteMessagePlaceholder")}
              value={inviteMessage}
            />
          </div>
          {rowInvite ? (
            <div
              ref={inviteLinkRef}
            >
              <FileHomeDetailField
                action={
                  <CopyableId
                    ariaLabel={t("sharing.owner.action.copyMintedInvite")}
                    copiedAriaLabel={t("sharing.owner.notice.inviteCopied")}
                    copiedTitle={t("sharing.owner.notice.inviteCopied")}
                    iconOnly
                    title={t("sharing.owner.action.copyMintedInvite")}
                    value={rowInvite.share_invite_url}
                  />
                }
                cardVariant="paired"
                className="h-full"
                label={t("sharing.owner.inviteLink.title")}
                mono
                value={rowInvite.share_invite_url}
              />
            </div>
          ) : null}
        </div>
      </FileHomeSection>
      </div>
    </div>
  );
}
