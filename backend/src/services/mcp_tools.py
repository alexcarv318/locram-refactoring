import shlex
import stat
import sys
from pathlib import Path

import database
from exceptions.mcp_tools import McpToolHiddenError
from interfaces.repositories.mcp_tools import IMcpToolVisibilityRepository
from interfaces.services.access import IAccessService
from interfaces.services.mcp_tools import IMcpToolService
from schemas.access import DesktopCapability
from schemas.mcp_tools import (
    MCP_TOOL_FAMILY_ORDER,
    MCP_TOOL_FAMILY_POLICIES,
    MCP_TOOL_POLICIES,
    McpToolFamilyPolicy,
    McpToolPolicy,
    McpToolVisibilityGroup,
    McpToolVisibilityRecord,
    McpToolVisibilitySettings,
)


class McpToolService(IMcpToolService):
    def __init__(
        self,
        mcp_tool_visibility_repository: IMcpToolVisibilityRepository,
        access_service: IAccessService,
    ) -> None:
        self._mcp_tool_visibility_repository = mcp_tool_visibility_repository
        self._access_service = access_service

    def visibility(self) -> McpToolVisibilitySettings:
        settings = self._mcp_tool_visibility_repository.load()
        edition = self._access_service.desktop_edition()
        activation = self._access_service.desktop_activation_status()
        groups = [
            self._group_payload(family, settings, edition.edition)
            for family in MCP_TOOL_FAMILY_ORDER
            if family in MCP_TOOL_FAMILY_POLICIES
        ]

        return McpToolVisibilitySettings(
            edition=edition,
            activation=activation,
            can_manage=self._access_service.has_capability(
                DesktopCapability.LOCAL_MCP_TOOL_VISIBILITY
            ),
            groups=groups,
            enabled_groups=dict(settings.enabled_groups),
            visible_tools=self._visible_tools(settings, edition.edition),
            effective_now=True,
            pending=False,
            requires_restart=False,
        )

    def update_visibility(self, enabled_groups: dict[str, bool]) -> McpToolVisibilitySettings:
        self._access_service.deny_without_capability(
            DesktopCapability.LOCAL_MCP_TOOL_VISIBILITY
        )
        current = self._mcp_tool_visibility_repository.load()
        merged = dict(current.enabled_groups)

        for family, enabled in enabled_groups.items():
            policy = MCP_TOOL_FAMILY_POLICIES.get(family)

            if policy is None or policy.required:
                continue

            merged[family] = enabled

        self._mcp_tool_visibility_repository.save(McpToolVisibilityRecord(enabled_groups=merged))

        return self.visibility()

    def is_visible(self, tool_name: str) -> bool:
        settings = self._mcp_tool_visibility_repository.load()
        edition = self._access_service.desktop_edition().edition

        return tool_name in self._visible_tools(settings, edition)

    def deny_hidden(self, tool_name: str) -> None:
        if self.is_visible(tool_name):
            return

        raise McpToolHiddenError(tool_name)

    def ensure_launcher(self) -> Path:
        path = self.launcher_path(database.locram_home)
        path.parent.mkdir(parents=True, exist_ok=True)
        script = self._launcher_script()

        if not path.is_file() or path.read_text() != script:
            path.write_text(script)

        if sys.platform != "win32":
            path.chmod(path.stat().st_mode | stat.S_IEXEC)

        return path

    def _visible_tools(self, settings: McpToolVisibilityRecord, edition: str) -> list[str]:
        return sorted(
            tool_name
            for tool_name, policy in MCP_TOOL_POLICIES.items()
            if self._tool_visible(policy, settings, edition)
        )

    def _tool_visible(
        self,
        policy: McpToolPolicy,
        settings: McpToolVisibilityRecord,
        edition: str,
    ) -> bool:
        if not self._capability_allowed(policy.capability):
            return False

        if edition == "free":
            return policy.default_visible_free

        family_enabled = self._family_enabled(
            MCP_TOOL_FAMILY_POLICIES[policy.family],
            settings,
            edition,
        )
        destructive_enabled = self._family_enabled(
            MCP_TOOL_FAMILY_POLICIES["destructive_tools"],
            settings,
            edition,
        )

        if policy.destructive_group_required:
            return family_enabled and destructive_enabled

        if policy.default_visible_pro:
            return family_enabled

        return family_enabled and settings.enabled_groups.get(policy.family) is True

    def _group_payload(
        self,
        family: str,
        settings: McpToolVisibilityRecord,
        edition: str,
    ) -> McpToolVisibilityGroup:
        policy = MCP_TOOL_FAMILY_POLICIES[family]
        default_enabled = (
            policy.default_enabled_pro if edition == "pro" else policy.default_enabled_free
        )

        return McpToolVisibilityGroup(
            family=family,
            label=policy.label,
            description=policy.description,
            required=policy.required,
            default_enabled_free=policy.default_enabled_free,
            default_enabled_pro=policy.default_enabled_pro,
            destructive=policy.destructive,
            enabled=self._family_enabled(policy, settings, edition),
            default_enabled=default_enabled,
            tools=sorted(
                tool_name
                for tool_name, tool in MCP_TOOL_POLICIES.items()
                if tool.family == family
            ),
        )

    def _family_enabled(
        self,
        policy: McpToolFamilyPolicy,
        settings: McpToolVisibilityRecord,
        edition: str,
    ) -> bool:
        if policy.required:
            return True

        if not self._capability_allowed(policy.capability):
            return False

        stored = settings.enabled_groups.get(policy.family)

        if stored is not None:
            return stored

        if edition == "pro":
            return policy.default_enabled_pro

        return policy.default_enabled_free

    def _capability_allowed(self, capability: str | None) -> bool:
        if capability is None:
            return True

        return self._access_service.has_capability(DesktopCapability(capability))

    @staticmethod
    def launcher_path(locram_home: Path) -> Path:
        name = "locram-mcp.cmd" if sys.platform == "win32" else "locram-mcp"

        return locram_home / "bin" / name

    @staticmethod
    def _launcher_script() -> str:
        source_path = Path(__file__).resolve().parent.parent
        locram_home = database.locram_home
        python_executable = Path(sys.executable)

        if sys.platform == "win32":
            return (
                "@echo off\r\n"
                f"set \"LOCRAM_HOME={locram_home}\"\r\n"
                f"set \"PYTHONPATH={source_path}\"\r\n"
                f"\"{python_executable}\" -m mcp_server.main %*\r\n"
            )

        return (
            "#!/bin/sh\n"
            "set -eu\n"
            f"export LOCRAM_HOME={shlex.quote(str(locram_home))}\n"
            f"export PYTHONPATH={shlex.quote(str(source_path))}\n"
            f"exec {shlex.quote(str(python_executable))} -m mcp_server.main \"$@\"\n"
        )
