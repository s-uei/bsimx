import React, { useMemo, useState, useReducer } from "react";
import { PickingInfo } from "@deck.gl/core/typed";
import { DeckGL } from "@deck.gl/react/typed";
import { StaticMap } from "react-map-gl";
import { BASEMAP } from "@deck.gl/carto/typed";
import Editor from "@monaco-editor/react";
import { useFrame, usePyodide } from "../hooks";
import { ScatterplotLayer } from "@deck.gl/layers/typed";
import { LineLayer, BitmapLayer } from "@deck.gl/layers/typed";
import { TripsLayer, TileLayer } from "@deck.gl/geo-layers/typed";
import { Agent, Simulation, zSimulation } from "../types";
import { emptySimulation, pythonCodes } from "../samples";

function getView(s: Simulation) {
  const nodes = s.node_link_data.nodes;
  const v: { lon: number; lat: number } =
    nodes.length === 0
      ? { lon: 134.036852, lat: 34.34273 } // 香川大学幸町キャンパス
      : (nodes.reduce(
          (a, n) => ({
            lat: (a.lat + n.lat) / 2,
            lon: (a.lon + n.lon) / 2,
          }),
          { lat: nodes[0].lat, lon: nodes[0].lon }
        ) as any);
  return v;
}

async function copyClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

export default function App() {
  const { pyodide, loading } = usePyodide();
  const today = useMemo(() => new Date(), []);
  const [code, setCode] = useState(pythonCodes[0]);
  const [simulation, setSimulation] = useState<Simulation>(emptySimulation);
  const [view, setView] = useState(getView(emptySimulation));
  const [progress, setProgress] = useState(0);
  const [visibleWaveTiles, toggleWaveTiles] = useReducer((b) => !b, false);
  const [picked, pick] = useState<PickingInfo | undefined>(undefined);

  const nodes = simulation.node_link_data.nodes;
  const agents = simulation.agents.map((a) => ({
    ...a,
    timelines: a.timelines.map((t) => ({
      ...t,
      node: nodes.find((n) => n.id === t.node),
    })),
  }));
  const links = simulation.node_link_data.links.flatMap((o) => {
    const source = nodes.find((n) => n.id === o.source);
    const target = nodes.find((n) => n.id === o.target);
    if (!source || !target) return [];
    return { ...o, source, target };
  });
  const timelimit = simulation.timelimit;
  const currentTime = timelimit * progress;
  const date = new Date(today.getTime());
  date.setSeconds(today.getSeconds() + currentTime);
  useFrame((_ts) => {
    const ts = _ts / 10;
    setProgress((p) => (p + ts <= 1 ? p + ts : p + ts - 1));
  }, []);
  return (
    <div className="app">
      <div className="bar">
        <button
          disabled={loading}
          onClick={async () => {
            if (!pyodide) return;
            const result = await pyodide.runPythonAsync(code);
            console.log(result);
            // for indexeddb persistance
            pyodide.FS.syncfs((err) => (err ? console.error(err) : err));
            const simulation = zSimulation.parse(JSON.parse(result));
            setView(getView(simulation));
            setSimulation(simulation);
          }}
        >
          <span className="material-symbols-outlined">play_arrow</span>
          Run
        </button>
      </div>
      <div className="editor">
        <Editor
          value={code}
          onChange={(v) => setCode(v ?? "")}
          theme="vs-dark"
          defaultLanguage="python"
          options={{ minimap: { enabled: false } }}
        />
      </div>
      <div className="map">
        <DeckGL
          initialViewState={{
            latitude: view.lat,
            longitude: view.lon,
            zoom: 15,
          }}
          controller={true}
          layers={[
            visibleWaveTiles &&
              new TileLayer({
                // https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html
                data: "https://disaportaldata.gsi.go.jp/raster/04_tsunami_newlegend_data/{z}/{x}/{y}.png",

                minZoom: 0,
                maxZoom: 19,
                tileSize: 256,
                opacity: 0.5,

                renderSubLayers: (props) => {
                  const {
                    bbox: { west, south, east, north },
                  } = props.tile as any;

                  return new BitmapLayer(props, {
                    data: null as any,
                    image: props.data,
                    bounds: [west, south, east, north],
                  });
                },
              }),
            new ScatterplotLayer({
              id: "node-layer",
              data: nodes,
              getPosition: (d: (typeof nodes)[number]) => [d.lon, d.lat],
              opacity: 0.1,
              pickable: true,
              onClick: (e) => pick(e),
              getRadius: () => 4,
            }),
            new LineLayer({
              id: "edge-layer",
              data: links,
              getSourcePosition: (d: (typeof links)[number]) => [
                d.source.lon,
                d.source.lat,
              ],
              getTargetPosition: (d: (typeof links)[number]) => [
                d.target.lon,
                d.target.lat,
              ],
              opacity: 0.1,
            }),
            new TripsLayer({
              id: "agent-layer",
              data: agents,
              getPath: (d: Agent) => {
                return d.timelines.map(
                  (t) => [t.node.lon, t.node.lat] as [number, number]
                );
              },
              getTimestamps: (d: Agent) => {
                return d.timelines.map((t) => t.time);
              },
              getWidth: () => 16,
              getColor: [255, 0, 0],
              currentTime,
              trailLength: 10,
            }),
          ]}
        >
          <StaticMap mapStyle={BASEMAP.VOYAGER} />
        </DeckGL>
        {picked?.object && (
          <div className="picked" style={{ top: picked.y, left: picked.x }}>
            <button onClick={() => pick(undefined)}>
              <span className="material-symbols-outlined">close</span>
            </button>
            <p>id: {picked.object.id}</p>
            <button
              onClick={() => {
                copyClipboard(picked.object.id);
                pick(undefined);
              }}
            >
              <span className="material-symbols-outlined">content_copy</span>
            </button>
            <p>(lat, lon): {`(${picked.object.lat}, ${picked.object.lon})`}</p>
            <button
              onClick={() => {
                copyClipboard(`(${picked.object.lat}, ${picked.object.lon})`);
                pick(undefined);
              }}
            >
              <span className="material-symbols-outlined">content_copy</span>
            </button>
          </div>
        )}
        <div className="clock">
          <time>{Math.floor((date.getTime() - today.getTime()) / 1000)}</time>
        </div>
        <div className="top-right">
          <button onClick={toggleWaveTiles}>
            <span className="material-symbols-outlined">waves</span>
          </button>
        </div>
        <div className="bottom-left">
          <a href="https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html">
            ハザードマップ出典：ハザードマップポータルサイト
          </a>
        </div>
      </div>
    </div>
  );
}
