import { useState, useCallback } from "react";

/*
 * RAIDER POD GENERATOR
 * Kagan-style heterogeneous grouping tool
 * Always pods of 4. Remainder students form pods of 3.
 * Matches Raider Randomizer: #0f0f1a bg, #C11430 red, Segoe UI + IBM Plex Mono
 */

const RED = "#C11430";

const Q_STYLE = {
  1: { bg: `${RED}18`, border: `${RED}33`, tag: "Q1 · Top 25%", short: "Q1", label: "Q1 · Top 25% (Highest)" },
  2: { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)", tag: "Q2 · 50–75%", short: "Q2", label: "Q2 · 50–75%" },
  3: { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)", tag: "Q3 · 25–50%", short: "Q3", label: "Q3 · 25–50%" },
  4: { bg: "rgba(0,0,0,0.2)", border: "rgba(255,255,255,0.06)", tag: "Q4 · Bottom 25%", short: "Q4", label: "Q4 · Bottom 25% (Lowest)" },
};

// ============ ALGORITHM ============

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildPods(quartiles, neverPairs) {
  const buckets = [1, 2, 3, 4].map((q) => shuffleArray(quartiles[q] || []));
  const minLen = Math.min(...buckets.map((b) => b.length));
  const pods = [];

  // Build full pods of 4
  for (let p = 0; p < minLen; p++) {
    pods.push([
      { name: buckets[0][p], quartile: 1 },
      { name: buckets[1][p], quartile: 2 },
      { name: buckets[2][p], quartile: 3 },
      { name: buckets[3][p], quartile: 4 },
    ]);
  }

  // Gather remainders
  const leftovers = [];
  for (let q = 0; q < 4; q++) {
    for (let i = minLen; i < buckets[q].length; i++) {
      leftovers.push({ name: buckets[q][i], quartile: q + 1 });
    }
  }

  // Form pods of 3 from remainders, distribute stragglers
  if (leftovers.length >= 3) {
    let temp = [];
    for (const s of leftovers) {
      temp.push(s);
      if (temp.length === 3) {
        pods.push([...temp]);
        temp = [];
      }
    }
    // 1-2 left over: tuck into existing pods
    if (temp.length > 0 && pods.length > 0) {
      temp.forEach((s, i) => pods[pods.length - 1 - (i % pods.length)].push(s));
    } else if (temp.length > 0) {
      pods.push(temp);
    }
  } else if (leftovers.length > 0 && pods.length > 0) {
    leftovers.forEach((s, i) => pods[i % pods.length].push(s));
  }

  return resolveNeverPairs(pods, neverPairs);
}

function resolveNeverPairs(pods, neverPairs) {
  if (!neverPairs.length) return pods;
  let improved = true;
  let iter = 0;
  while (improved && iter < 50) {
    improved = false;
    iter++;
    for (const [nameA, nameB] of neverPairs) {
      let pA = -1, iA = -1, pB = -1, iB = -1;
      pods.forEach((pod, pi) => pod.forEach((s, si) => {
        if (s.name === nameA) { pA = pi; iA = si; }
        if (s.name === nameB) { pB = pi; iB = si; }
      }));
      if (pA >= 0 && pB >= 0 && pA === pB) {
        const student = pods[pA][iA];
        let swapped = false;
        for (let pi = 0; pi < pods.length && !swapped; pi++) {
          if (pi === pA) continue;
          for (let si = 0; si < pods[pi].length && !swapped; si++) {
            if (pods[pi][si].quartile === student.quartile) {
              const cand = pods[pi][si];
              const conflict = neverPairs.some(([a, b]) =>
                (a === cand.name && pods[pA].some((s, idx) => idx !== iA && s.name === b)) ||
                (b === cand.name && pods[pA].some((s, idx) => idx !== iA && s.name === a))
              );
              if (!conflict) {
                [pods[pA][iA], pods[pi][si]] = [pods[pi][si], pods[pA][iA]];
                swapped = true;
                improved = true;
              }
            }
          }
        }
      }
    }
  }
  return pods;
}

// ============ COMPONENTS ============

function DragName({ name, quartile }) {
  const s = quartile ? Q_STYLE[quartile] : null;
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({ name, fromQ: quartile || 0 }));
        e.target.style.opacity = "0.4";
      }}
      onDragEnd={(e) => { e.target.style.opacity = "1"; }}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 12px", borderRadius: 6, cursor: "grab", userSelect: "none",
        background: s ? s.bg : "rgba(255,255,255,0.04)",
        border: `1px solid ${s ? s.border : "rgba(255,255,255,0.1)"}`,
        color: "#ddd", fontSize: 12, fontWeight: 600, transition: "all 0.1s",
      }}
    >
      {name}
      {quartile && <span style={{ fontSize: 9, color: "#666", fontWeight: 400 }}>{s?.short}</span>}
    </div>
  );
}

function DropBucket({ quartile, students, onDrop }) {
  const [over, setOver] = useState(false);
  const s = Q_STYLE[quartile];
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setOver(false);
        try { const d = JSON.parse(e.dataTransfer.getData("text/plain")); onDrop(d.name, d.fromQ, quartile); } catch {}
      }}
      style={{
        padding: 12, borderRadius: 10, minHeight: 52, transition: "all 0.15s",
        background: over ? `${RED}12` : s.bg,
        border: `1px solid ${over ? `${RED}44` : s.border}`,
      }}
    >
      <div style={{
        fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5,
        marginBottom: 8, display: "flex", justifyContent: "space-between",
        color: quartile === 1 ? RED : "#888",
      }}>
        <span>{s.label}</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 400 }}>{students.length}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {students.map((name) => <DragName key={name} name={name} quartile={quartile} />)}
        {students.length === 0 && <span style={{ fontSize: 11, color: "#444", fontStyle: "italic" }}>Drag students here</span>}
      </div>
    </div>
  );
}

function PodCard({ pod, podIndex, locked, onToggleLock, neverPairs }) {
  const violations = new Set();
  neverPairs.forEach(([a, b]) => {
    if (pod.some((s) => s.name === a) && pod.some((s) => s.name === b)) { violations.add(a); violations.add(b); }
  });
  const is3 = pod.length <= 3;

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${violations.size > 0 ? "rgba(255,80,80,0.35)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 12, padding: 14,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: 1.5 }}>
          Pod {podIndex + 1}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {violations.size > 0 && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: "rgba(255,80,80,0.12)", color: "#f55" }}>⚠ CONFLICT</span>}
          {is3 && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: "rgba(255,255,255,0.04)", color: "#666" }}>Pod of 3</span>}
        </div>
      </div>

      <div style={{ fontSize: 8, color: "#444", textAlign: "center", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>↑ far from teacher</div>

      {is3 ? (
        <>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
            <Seat s={pod[0]} locked={locked} onToggleLock={onToggleLock} violation={violations.has(pod[0]?.name)} />
          </div>
          <div style={{ textAlign: "center", fontSize: 8, color: "#444", margin: "2px 0" }}>↙ face ↘</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            <Seat s={pod[1]} locked={locked} onToggleLock={onToggleLock} violation={violations.has(pod[1]?.name)} />
            <div style={{ display: "flex", alignItems: "center", fontSize: 8, color: "#444" }}>↔</div>
            <Seat s={pod[2]} locked={locked} onToggleLock={onToggleLock} violation={violations.has(pod[2]?.name)} />
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            <Seat s={pod[0]} locked={locked} onToggleLock={onToggleLock} violation={violations.has(pod[0]?.name)} />
            <div style={{ display: "flex", alignItems: "center", fontSize: 8, color: "#444" }}>↔ face</div>
            <Seat s={pod[1]} locked={locked} onToggleLock={onToggleLock} violation={violations.has(pod[1]?.name)} />
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 70, margin: "2px 0" }}>
            <span style={{ fontSize: 8, color: "#444" }}>↕ shoulder</span>
            <span style={{ fontSize: 8, color: "#444" }}>↕ shoulder</span>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            <Seat s={pod[2]} locked={locked} onToggleLock={onToggleLock} violation={violations.has(pod[2]?.name)} />
            <div style={{ display: "flex", alignItems: "center", fontSize: 8, color: "#444" }}>↔ face</div>
            <Seat s={pod[3]} locked={locked} onToggleLock={onToggleLock} violation={violations.has(pod[3]?.name)} />
          </div>
          {pod.length > 4 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 6, paddingTop: 6, borderTop: "1px dashed rgba(255,255,255,0.06)" }}>
              {pod.slice(4).map((s) => <Seat key={s.name} s={s} locked={locked} onToggleLock={onToggleLock} violation={violations.has(s?.name)} />)}
            </div>
          )}
        </>
      )}

      <div style={{ fontSize: 8, color: "#444", textAlign: "center", textTransform: "uppercase", letterSpacing: 2, marginTop: 6 }}>↓ near teacher</div>
    </div>
  );
}

function Seat({ s, locked, onToggleLock, violation }) {
  if (!s) return <div style={{ width: 110, height: 50 }} />;
  const isLocked = locked.has(s.name);
  const qs = Q_STYLE[s.quartile] || Q_STYLE[1];
  return (
    <div onClick={() => onToggleLock(s.name)} style={{
      width: 110, padding: "6px 4px", borderRadius: 8, cursor: "pointer",
      textAlign: "center", transition: "all 0.15s", position: "relative",
      background: violation ? "rgba(255,80,80,0.08)" : isLocked ? `${RED}15` : "rgba(255,255,255,0.04)",
      border: `${isLocked ? "2px" : "1px"} solid ${violation ? "rgba(255,80,80,0.3)" : isLocked ? `${RED}55` : "rgba(255,255,255,0.08)"}`,
    }}>
      {isLocked && <span style={{ position: "absolute", top: 2, right: 4, fontSize: 9 }}>🔒</span>}
      <div style={{ fontSize: 12, fontWeight: 700, color: "#eee", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
      <div style={{ fontSize: 9, color: "#666", marginTop: 1 }}>{qs.short}</div>
    </div>
  );
}

// ============ MAIN ============

export default function RaiderPodGenerator() {
  const [view, setView] = useState("setup");
  const [inputMode, setInputMode] = useState("drag");
  const [rawInput, setRawInput] = useState("");
  const [unsorted, setUnsorted] = useState([]);
  const [quartiles, setQuartiles] = useState({ 1: [], 2: [], 3: [], 4: [] });
  const [pasteInputs, setPasteInputs] = useState({ 1: "", 2: "", 3: "", 4: "" });
  const [pods, setPods] = useState([]);
  const [neverPairs, setNeverPairs] = useState([]);
  const [neverA, setNeverA] = useState("");
  const [neverB, setNeverB] = useState("");
  const [locked, setLocked] = useState(new Set());
  const [toastMsg, setToastMsg] = useState("");
  const [savedClasses, setSavedClasses] = useState(() => {
    try { return JSON.parse(localStorage.getItem("rr_pods_v3") || "{}"); } catch { return {}; }
  });

  const toast = (m) => { setToastMsg(m); setTimeout(() => setToastMsg(""), 2000); };
  const allStudents = [...unsorted, ...quartiles[1], ...quartiles[2], ...quartiles[3], ...quartiles[4]];
  const sortedCount = quartiles[1].length + quartiles[2].length + quartiles[3].length + quartiles[4].length;

  const loadNames = () => {
    const names = rawInput.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    if (!names.length) return;
    const existing = new Set(allStudents);
    const fresh = names.filter((n) => !existing.has(n));
    setUnsorted((prev) => [...prev, ...fresh]);
    toast(`${fresh.length} name${fresh.length !== 1 ? "s" : ""} added`);
  };

  const applyPaste = () => {
    const newQ = {};
    let total = 0;
    for (let q = 1; q <= 4; q++) {
      const names = (pasteInputs[q] || "").split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      newQ[q] = names;
      total += names.length;
    }
    setQuartiles(newQ);
    setUnsorted([]);
    toast(`${total} students loaded into quartiles`);
  };

  const handleDrop = (name, fromQ, toQ) => {
    if (fromQ === toQ) return;
    if (fromQ === 0 || fromQ === null || fromQ === undefined) {
      setUnsorted((prev) => prev.filter((n) => n !== name));
    } else {
      setQuartiles((prev) => ({ ...prev, [fromQ]: prev[fromQ].filter((n) => n !== name) }));
    }
    if (toQ === 0) {
      setUnsorted((prev) => [...prev, name]);
    } else {
      setQuartiles((prev) => ({ ...prev, [toQ]: [...prev[toQ], name] }));
    }
  };

  const generate = () => {
    if (sortedCount < 3) { toast("Need at least 3 students sorted into quartiles"); return; }
    setPods(buildPods(quartiles, neverPairs));
    setView("pods");
  };

  const reshuffle = () => setPods(buildPods(quartiles, neverPairs));
  const toggleLock = (name) => setLocked((prev) => { const n = new Set(prev); if (n.has(name)) n.delete(name); else n.add(name); return n; });

  const addNeverPair = () => {
    if (!neverA || !neverB || neverA === neverB) return;
    if (neverPairs.some(([a, b]) => (a === neverA && b === neverB) || (a === neverB && b === neverA))) { toast("Rule already exists"); return; }
    setNeverPairs([...neverPairs, [neverA, neverB]]);
    setNeverA(""); setNeverB("");
  };

  const saveClass = () => {
    const name = prompt('Name this class (e.g. "Period 1"):');
    if (!name?.trim()) return;
    const updated = { ...savedClasses, [name.trim()]: { quartiles, unsorted, neverPairs } };
    setSavedClasses(updated);
    try { localStorage.setItem("rr_pods_v3", JSON.stringify(updated)); } catch {}
    toast(`Saved "${name.trim()}"`);
  };

  const loadClass = (key) => {
    const cls = savedClasses[key];
    if (!cls) return;
    setQuartiles(cls.quartiles || { 1: [], 2: [], 3: [], 4: [] });
    setUnsorted(cls.unsorted || []);
    setNeverPairs(cls.neverPairs || []);
    setPods([]); setView("setup");
    const pi = {}; for (let q = 1; q <= 4; q++) pi[q] = (cls.quartiles?.[q] || []).join("\n");
    setPasteInputs(pi);
    toast(`Loaded "${key}"`);
  };

  const deleteClass = (key) => {
    if (!confirm(`Delete "${key}"?`)) return;
    const updated = { ...savedClasses }; delete updated[key];
    setSavedClasses(updated);
    try { localStorage.setItem("rr_pods_v3", JSON.stringify(updated)); } catch {}
  };

  const copyPods = () => {
    if (!pods.length) return;
    const lines = pods.map((pod, i) =>
      `Pod ${i + 1}: ${pod.map((s) => `${s.name} (${Q_STYLE[s.quartile]?.short})`).join(", ")}`
    );
    navigator.clipboard.writeText(lines.join("\n")).then(() => toast("Copied!"));
  };

  const clearAll = () => {
    if (!confirm("Clear all students?")) return;
    setUnsorted([]); setQuartiles({ 1: [], 2: [], 3: [], 4: [] });
    setPods([]); setPasteInputs({ 1: "", 2: "", 3: "", 4: "" });
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#0f0f1a", color: "#eee", minHeight: "100vh", padding: "20px 16px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 3, color: "#666", marginBottom: 3 }}>Regis Jesuit High School</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, background: `linear-gradient(135deg, ${RED}, #D4243B)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Raider Pod Generator
          </h1>
          <div style={{ fontSize: 11, color: "#666", marginTop: 3 }}>
            Kagan heterogeneous pods · Shoulder partners 2 quartiles apart · No data leaves your browser
          </div>
        </div>

        {/* VIEW TOGGLE */}
        <div style={{ display: "flex", gap: 4, marginBottom: 12, justifyContent: "center" }}>
          {[{ id: "setup", label: "Setup & Sort" }, { id: "pods", label: `Pods${pods.length ? ` (${pods.length})` : ""}` }].map((t) => (
            <button key={t.id} onClick={() => setView(t.id)} style={{
              padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
              background: view === t.id ? `${RED}22` : "rgba(255,255,255,0.04)",
              color: view === t.id ? RED : "#888",
              border: `1px solid ${view === t.id ? `${RED}44` : "transparent"}`,
            }}>{t.label}</button>
          ))}
        </div>

        {/* ===== SETUP ===== */}
        {view === "setup" && (
          <>
            {/* Saved Classes */}
            {Object.keys(savedClasses).length > 0 && (
              <div style={{ ...card, marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Saved Classes</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {Object.keys(savedClasses).map((key) => (
                    <button key={key} onClick={() => loadClass(key)} style={svBtn}>
                      {key}
                      <span onClick={(e) => { e.stopPropagation(); deleteClass(key); }} style={{ marginLeft: 5, color: "#666", cursor: "pointer" }}>✕</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div style={{ ...card, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                {[{ id: "drag", label: "Paste Names → Drag to Sort" }, { id: "paste", label: "Paste Directly into Quartiles" }].map((m) => (
                  <button key={m.id} onClick={() => setInputMode(m.id)} style={{
                    padding: "5px 14px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                    background: inputMode === m.id ? `${RED}1a` : "rgba(255,255,255,0.03)",
                    color: inputMode === m.id ? RED : "#888",
                    border: `1px solid ${inputMode === m.id ? `${RED}44` : "transparent"}`,
                  }}>{m.label}</button>
                ))}
              </div>

              {inputMode === "drag" && (
                <>
                  <textarea value={rawInput} onChange={(e) => setRawInput(e.target.value)}
                    placeholder="Paste student names — one per line or comma-separated" style={ta} />
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 8, marginBottom: 12 }}>
                    <button onClick={loadNames} style={btn}>Load Names</button>
                    {allStudents.length > 0 && <button onClick={saveClass} style={bo}>Save as Class</button>}
                    {allStudents.length > 0 && <button onClick={clearAll} style={bo}>Clear All</button>}
                    {allStudents.length > 0 && (
                      <span style={{ fontSize: 11, color: "#888", fontFamily: "'IBM Plex Mono', monospace" }}>
                        {sortedCount}/{allStudents.length} sorted
                      </span>
                    )}
                  </div>

                  {unsorted.length > 0 && (
                    <div onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); try { const d = JSON.parse(e.dataTransfer.getData("text/plain")); handleDrop(d.name, d.fromQ, 0); } catch {} }}
                      style={{ padding: 12, borderRadius: 10, marginBottom: 10, background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.12)", minHeight: 40 }}>
                      <div style={{ ...sl, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                        <span>Unsorted Pool</span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 400 }}>{unsorted.length}</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {unsorted.map((name) => <DragName key={name} name={name} quartile={null} />)}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[1, 2, 3, 4].map((q) => (
                      <DropBucket key={q} quartile={q} students={quartiles[q] || []} onDrop={handleDrop} />
                    ))}
                  </div>
                </>
              )}

              {inputMode === "paste" && (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[1, 2, 3, 4].map((q) => (
                      <div key={q}>
                        <div style={{ ...sl, marginBottom: 4, color: q === 1 ? RED : "#888" }}>{Q_STYLE[q].label}</div>
                        <textarea value={pasteInputs[q] || ""} onChange={(e) => setPasteInputs((p) => ({ ...p, [q]: e.target.value }))}
                          placeholder="Paste names — one per line or comma-separated" style={{ ...ta, minHeight: 50 }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
                    <button onClick={applyPaste} style={btn}>Load into Quartiles</button>
                    {sortedCount > 0 && <button onClick={saveClass} style={bo}>Save as Class</button>}
                    {sortedCount > 0 && <button onClick={clearAll} style={bo}>Clear All</button>}
                  </div>
                </>
              )}
            </div>

            {/* Never-Pair */}
            {allStudents.length >= 2 && (
              <div style={{ ...card, marginBottom: 10 }}>
                <div style={{ ...sl, marginBottom: 6 }}>Never-Pair Rules</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                  <select value={neverA} onChange={(e) => setNeverA(e.target.value)} style={sel}>
                    <option value="">Student A…</option>
                    {[...allStudents].sort().map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span style={{ fontSize: 12, color: "#555", fontWeight: 700 }}>≠</span>
                  <select value={neverB} onChange={(e) => setNeverB(e.target.value)} style={sel}>
                    <option value="">Student B…</option>
                    {[...allStudents].filter((n) => n !== neverA).sort().map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <button onClick={addNeverPair} style={{ ...bo, color: RED, borderColor: `${RED}33` }}>+ Add</button>
                </div>
                {neverPairs.length > 0 ? (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {neverPairs.map(([a, b], i) => (
                      <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${RED}12`, color: RED }}>
                        {a} ≠ {b}
                        <span onClick={() => setNeverPairs(neverPairs.filter((_, j) => j !== i))} style={{ cursor: "pointer", opacity: 0.6 }}>✕</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "#444" }}>No rules — all pairings allowed</div>
                )}
              </div>
            )}

            {/* Generate */}
            {sortedCount >= 3 && (
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <button onClick={generate} style={{ ...btn, fontSize: 15, padding: "12px 40px", borderRadius: 10 }}>Generate Pods</button>
                {unsorted.length > 0 && (
                  <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>
                    {unsorted.length} student{unsorted.length !== 1 ? "s" : ""} still unsorted — they won't be placed
                  </div>
                )}
              </div>
            )}

            {/* Reference Diagram */}
            {allStudents.length === 0 && (
              <div style={{ ...card, marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", marginBottom: 8 }}>How Kagan Pod Seating Works</div>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#666", marginBottom: 4 }}>Pod of 4 (default):</div>
                    <pre style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#777", lineHeight: 1.7 }}>
{`┌──────────┬──────────┐
│ Q1  Top  │ Q2  2nd  │ ← Far
│  25%     │  25%     │
├─shoulder──┼─shoulder──┤
│ Q3  3rd  │ Q4  Low  │ ← Near
│  25%     │  25%     │
└──────────┴──────────┘
Shoulder: Q1↕Q3, Q2↕Q4 (2 apart)
Face:     Q1↔Q2, Q3↔Q4 (1 apart)`}
                    </pre>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#666", marginBottom: 4 }}>Pod of 3 (remainder):</div>
                    <pre style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#777", lineHeight: 1.7 }}>
{`     ┌─────────┐
     │ Q1 Top  │ ← Far
     │         │
  ┌──┴────┬────┴──┐
  │ Q2 Mid│Q3 Low │ ← Near
  │       │       │
  └───────┴───────┘`}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== PODS ===== */}
        {view === "pods" && (
          <>
            {pods.length > 0 ? (
              <>
                <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 12, flexWrap: "wrap" }}>
                  <button onClick={reshuffle} style={btn}>↻ Reshuffle</button>
                  <button onClick={copyPods} style={bo}>📋 Copy Pods</button>
                  <button onClick={() => setView("setup")} style={bo}>← Back to Setup</button>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", fontSize: 10, color: "#666", alignItems: "center" }}>
                  {[1, 2, 3, 4].map((q) => (
                    <span key={q} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: Q_STYLE[q].border }}></span>
                      {Q_STYLE[q].tag}
                    </span>
                  ))}
                  <span style={{ color: "#555" }}>· Click to lock 🔒</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10, marginBottom: 16 }}>
                  {pods.map((pod, i) => (
                    <PodCard key={i} pod={pod} podIndex={i} locked={locked} onToggleLock={toggleLock} neverPairs={neverPairs} />
                  ))}
                </div>

                <div style={{ textAlign: "center", fontSize: 11, color: "#666" }}>
                  {pods.reduce((s, p) => s + p.length, 0)} students · {pods.filter((p) => p.length === 4).length} pods of 4
                  {pods.filter((p) => p.length === 3).length > 0 && ` · ${pods.filter((p) => p.length === 3).length} pod${pods.filter((p) => p.length === 3).length > 1 ? "s" : ""} of 3`}
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#555" }}>
                <div style={{ fontSize: 14, marginBottom: 8 }}>No pods generated yet</div>
                <button onClick={() => setView("setup")} style={btn}>Go to Setup</button>
              </div>
            )}
          </>
        )}

        <div style={{ textAlign: "center", marginTop: 24, paddingTop: 12, fontSize: 9, color: "#444", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          Raider Pod Generator · Kagan Heterogeneous Grouping · No data leaves your browser
        </div>
      </div>

      {toastMsg && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", padding: "8px 20px", borderRadius: 8, background: RED, color: "#fff", fontWeight: 700, fontSize: 12, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}

const card = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14 };
const btn = { padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${RED}, #D4243B)`, color: "#fff", fontWeight: 700, fontSize: 12, fontFamily: "inherit" };
const bo = { padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", background: "none", color: "#ccc", cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 600 };
const svBtn = { padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#ccc", cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 600 };
const sl = { fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 };
const ta = { width: "100%", minHeight: 70, padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "#eee", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none" };
const sel = { padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.3)", color: "#eee", fontSize: 12, fontFamily: "inherit", outline: "none", minWidth: 140 };
