export default function PanelLoading() {
  return (
    <div className="arc-panel-wrap" aria-hidden="true">
      <aside className="arc-panel" data-arc-panel data-arc-panel-skeleton>
        <p className="panel-eyebrow">Story Arc</p>
        <div className="skel-line skel-title" />
        <div className="panel-divider" />
        <div className="panel-log">
          <div className="skel-line" style={{ width: "60%" }} />
          <div className="skel-line" style={{ width: "92%" }} />
          <div className="skel-line" style={{ width: "84%" }} />
          <div className="skel-line" style={{ width: "70%", marginTop: 18 }} />
          <div className="skel-line" style={{ width: "88%" }} />
          <div className="skel-line" style={{ width: "76%" }} />
        </div>
      </aside>
    </div>
  );
}
