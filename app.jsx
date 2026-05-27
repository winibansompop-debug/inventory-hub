// Main app shell — routing + screen mounting

function App() {
  const [screen, setScreen] = useState("dashboard");
  const [param, setParam] = useState(null);

  const nav = (s, p) => {
    setScreen(s);
    setParam(p || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const breadcrumbs = {
    dashboard: ["หน้าหลัก", "ภาพรวม"],
    receive: ["หน้าหลัก", "รับเข้า"],
    issue: ["หน้าหลัก", "จ่ายออก"],
    items: ["หน้าหลัก", "สินค้า"],
    locations: ["หน้าหลัก", "คลัง / โชว์รูม"],
    "stock-report": ["หน้าหลัก", "รายงาน", "สินค้าคงเหลือ"],
    "movement-report": ["หน้าหลัก", "รายงาน", "การเคลื่อนไหว"],
  };

  let screenEl;
  switch (screen) {
    case "dashboard": screenEl = <ScreenDashboard onNav={nav} />; break;
    case "receive": screenEl = <ScreenReceive />; break;
    case "issue": screenEl = <ScreenIssue />; break;
    case "items": screenEl = <ScreenItems initialSku={param} onNav={nav} />; break;
    case "locations": screenEl = <ScreenLocations initialLoc={param} onNav={nav} />; break;
    case "stock-report": screenEl = <ScreenStockReport />; break;
    case "movement-report": screenEl = <ScreenMovementReport />; break;
    default: screenEl = <ScreenDashboard onNav={nav} />;
  }

  return (
    <StoreProvider>
      <StoreConsumerView screen={screen} param={param} onNav={nav} breadcrumbs={breadcrumbs[screen]}>
        {screenEl}
      </StoreConsumerView>
    </StoreProvider>
  );
}

function StoreConsumerView({ screen, breadcrumbs, onNav, children }) {
  return (
    <>
      <div className="app">
        <Sidebar current={screen} onNav={onNav} />
        <main className="main">
          <Topbar title={screen} breadcrumbs={breadcrumbs} />
          {children}
        </main>
      </div>
      <MobileTabbar current={screen} onNav={onNav} />
      <ToastStack />
      <TweaksMount />
    </>
  );
}

// ========== Tweaks integration ==========
function TweaksMount() {
  const [t, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "accentHue": 260,
    "fontScale": 1,
    "roundCorners": "normal"
  }/*EDITMODE-END*/);
  const { setRole, role } = useStore();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", `oklch(0.5 0.16 ${t.accentHue})`);
    root.style.setProperty("--accent-soft", `oklch(0.94 0.04 ${t.accentHue})`);
    root.style.setProperty("--accent-ink", `oklch(0.35 0.13 ${t.accentHue})`);
    root.style.fontSize = (14 * t.fontScale) + "px";
    const r = t.roundCorners === "sharp" ? { sm: 3, md: 5, lg: 7, xl: 10 } : t.roundCorners === "soft" ? { sm: 8, md: 14, lg: 20, xl: 28 } : { sm: 6, md: 10, lg: 14, xl: 20 };
    root.style.setProperty("--r-sm", r.sm + "px");
    root.style.setProperty("--r-md", r.md + "px");
    root.style.setProperty("--r-lg", r.lg + "px");
    root.style.setProperty("--r-xl", r.xl + "px");
  }, [t]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="ลักษณะ">
        <TweakSlider label="Accent Hue" value={t.accentHue} min={0} max={360} step={5} onChange={v => setTweak("accentHue", v)} unit="°" />
        <TweakRadio label="ความโค้งขอบ" value={t.roundCorners} options={[
          { value: "sharp", label: "Sharp" },
          { value: "normal", label: "Normal" },
          { value: "soft", label: "Soft" },
        ]} onChange={v => setTweak("roundCorners", v)} />
        <TweakSlider label="Font Scale" value={t.fontScale} min={0.85} max={1.2} step={0.05} onChange={v => setTweak("fontScale", v)} />
      </TweakSection>
      <TweakSection label="บทบาท">
        <TweakRadio label="ผู้ใช้งาน" value={role} options={[
          { value: "operator", label: "พนักงาน" },
          { value: "manager", label: "ผู้จัดการ" },
        ]} onChange={v => setRole(v)} />
      </TweakSection>
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
