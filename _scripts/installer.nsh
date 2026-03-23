!define IRST_TOOLS_URL "https://armediasolutions.net/tools/irst"

!macro customInstall
  ${IfNot} ${Silent}
    ${StdUtils.ExecShellAsUser} $0 "${IRST_TOOLS_URL}" "open" ""
  ${EndIf}
!macroend
