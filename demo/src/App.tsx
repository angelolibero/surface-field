import * as React from "react";
import { Tabs } from "radix-ui";
import { HugeiconsIcon } from "@hugeicons/react";
import { GithubIcon } from "@hugeicons/core-free-icons";
import { PlaygroundDemo } from "./PlaygroundDemo";
import { useFieldSettings } from "./FieldControls";

/* React Flow is loaded with its tab, so the playground never pays for it. */
const FlowDemo = React.lazy(() => import("./FlowDemo").then(module => ({ default: module.FlowDemo })));

const tabs = [
  { id: "playground", label: "Playground", hash: "" },
  { id: "react-flow", label: "React Flow", hash: "#react-flow" },
] as const;
type TabId = (typeof tabs)[number]["id"];

const tabFromHash = (): TabId => tabs.find(tab => tab.hash && tab.hash === window.location.hash)?.id ?? "playground";

export default function App() {
  const [tab, setTab] = React.useState<TabId>(tabFromHash);
  const [dark, setDark] = React.useState(false);
  /* One field, two tabs: the settings live here so a tab switch keeps them. */
  const settings = useFieldSettings();

  /* Layout effect for the same reason as the tint: a tab's `refreshTheme` must see the class. */
  React.useLayoutEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  /* The tab is the hash, so a demo can be linked; the default tab keeps a bare URL. */
  React.useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const choose = (value: string) => {
    const next = tabs.find(item => item.id === value);
    if (!next) return;
    setTab(next.id);
    const { pathname, search } = window.location;
    window.history.replaceState(null, "", `${pathname}${search}${next.hash}`);
  };

  return <Tabs.Root className="app-shell" value={tab} onValueChange={choose}>
    <Tabs.List className="demo-tabs" aria-label="Demo" style={{ "--tab-index": tabs.findIndex(item => item.id === tab) } as React.CSSProperties}>
      <span className="demo-tabs-thumb" aria-hidden="true" />
      {tabs.map(item => <Tabs.Trigger key={item.id} value={item.id} className="demo-tab">{item.label}</Tabs.Trigger>)}
    </Tabs.List>
    <Tabs.Content value="playground" className="demo-panel"><PlaygroundDemo settings={settings} dark={dark} setDark={setDark} /></Tabs.Content>
    <Tabs.Content value="react-flow" className="demo-panel"><React.Suspense fallback={null}><FlowDemo settings={settings} dark={dark} setDark={setDark} /></React.Suspense></Tabs.Content>
    <div className="viewport-credit">
      <a href="https://github.com/angelolibero" target="_blank" rel="noopener noreferrer">Made by Angelo Libero</a>
      <a href="https://github.com/angelolibero/surface-field" target="_blank" rel="noopener noreferrer" aria-label="Surface Field on GitHub" title="Surface Field on GitHub"><HugeiconsIcon icon={GithubIcon} size={14} /></a>
    </div>
  </Tabs.Root>;
}
