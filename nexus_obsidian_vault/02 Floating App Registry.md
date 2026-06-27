# 02 Floating App Registry

## 目的

Floating App Registry 是 Workspace Floating Runtime 的 app 清單。

它讓未來所有新功能都能以 metadata + component 的方式接入 Workspace，而不是把所有功能寫死在 WorkspaceShell。

## Floating App Definition

建議 app definition 長這樣：

```ts
type FloatingAppDefinition = {
  kind: string;
  title: string;
  scope: 'account' | 'workspace' | 'resource' | 'system' | 'public';
  component: ComponentType<FloatingAppProps>;
  defaultSize: { width: number; height: number };
  minSize?: { width: number; height: number };
  singleton?: boolean;
  allowMultiple?: boolean;
  icon?: string;
  capabilities?: NexusCapabilityKind[];
  archetype?: NexusProductArchetypeKind;
  lifecycle?: 'active' | 'demo' | 'internal' | 'legacy' | 'planned';
};
```

## 現在與未來 app

已存在或已 proof-of-concept 的 app：

- sandbox
- global-chat
- notes
- artifact-library
- artifact-preview
- forum
- feed
- profile-preview
- developer-inspector

未來 app：

- marketplace / Airtasker-like
- Reddit-like
- Instagram-like
- Canva-like
- workflow builder
- model console
- media studio

## 原則

Workspace 不應該這樣：

```tsx
{kind === 'forum' && <Forum />}
{kind === 'feed' && <Feed />}
{kind === 'marketplace' && <Marketplace />}
```

而應該這樣：

```tsx
const app = floatingAppRegistry.get(window.kind)
return <FloatingWindowFrame><app.component /></FloatingWindowFrame>
```

## 成功標準

新增 app 時：

- 不需要改 WorkspaceShell 主要邏輯。
- 只需新增 feature folder。
- 只需新增 registry entry。
- capability / archetype 只當 metadata。
