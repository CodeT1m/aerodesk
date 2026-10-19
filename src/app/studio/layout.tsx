import { preloadModule } from "react-dom";

export { metadata, viewport } from "next-sanity/studio";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const bridgeScript = "https://core.sanity-cdn.com/bridge.js";
  preloadModule(bridgeScript, { as: "script" });
  return (
    <div className="h-dvh min-h-full w-full overflow-hidden">
      <script src={bridgeScript} async type="module" />
      {children}
    </div>
  );
}
