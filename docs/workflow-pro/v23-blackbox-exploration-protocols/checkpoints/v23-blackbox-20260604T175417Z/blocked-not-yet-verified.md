# Blocked / Not Yet Verified

Run ID: `v23-blackbox-20260604T175417Z`

## Blocked Or Product-Risk

| ID | Status | Evidence | Details | Required next step |
|---|---|---|---|---|
| `C-P02-001` | product-risk | `E-P02-003`, `E-P02-004` | Localhost session route creates owner workspace, but state/artifacts deny the same workspace. | P0 repair: align local bearer-token workspace session creation with the permission store used by downstream routes. |
| `C-P02-002` | product-risk | `E-P02-003`, `E-P02-007` | Direct authenticated RPC creates comparable membership and downstream permission passes, so the local route authority selection is likely the blocker. | Add regression test and repair route/service selection. |
| `B-LINE-001` | completed | `LE-LINE-001` | LINE Keep report posting was completed through Computer Use with a sanitized progress message. | Continue the same sanitized loop in future rounds if exploration continues. |

## Not Yet Verified

| ID | Surface | Why not verified | Required evidence |
|---|---|---|---|
| `NYV-UI-001` | Workflow Pro visible UI after login | Computer Use only reached auth gate. | Computer Use sign-up/login and Workflow Pro operation. |
| `NYV-UI-002` | Open Graph, Open Panels, Export Contract, Import Contract, Apply Preview | Source exists, but no screen operation. | Computer Use screen evidence. |
| `NYV-UI-003` | Runtime active-node progress and reload recovery | API trace works, visible UI not run. | Computer Use run plus reload check. |
| `NYV-UI-004` | Generated history and download from UI | API artifact download works, UI history/download not operated. | Computer Use history/download evidence. |
| `NYV-P06-001` | Preview and production parity | No current deployed target was live-probed. | Deployed live route/account matrix with sanitized evidence. |
| `NYV-MEDIA-001` | Native vision understanding | Source suggests file/reference boundary, no actual pixel-to-model evidence. | Real provider vision probe tied to workflow UI/runtime. |
| `NYV-MEDIA-002` | Native audio transcription/understanding | No real audio provider bridge proof. | Real audio provider probe or explicit unsupported verdict. |
| `NYV-LOAD-001` | Branch-count/load behavior | Hypotheses created, no load run. | Controlled branch/load run after auth repair. |
| `NYV-ROLE-001` | owner/editor/viewer/new account UI matrix | Only throwaway API account tested. | Role matrix with UI and API evidence. |
