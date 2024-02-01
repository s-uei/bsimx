import type { loadPyodide } from "pyodide";
import z from "zod";

declare global {
  interface Window {
    loadPyodide: typeof loadPyodide;
  }
}

// networkx definition
// https://github.com/networkx/networkx/blob/main/networkx/readwrite/json_graph/node_link.py
export const zNodeLinkData = z.object({
  directed: z.boolean(),
  multigraph: z.boolean(),
  graph: z.record(z.any()),
  nodes: z.array(z.record(z.any())),
  links: z.array(z.record(z.any())),
});

export type NodeLinkData = z.infer<typeof zNodeLinkData>;

export const zAgent = z.record(z.any());

export type Agent = z.infer<typeof zAgent>;

export const zSimulation = z.object({
  node_link_data: zNodeLinkData,
  agents: zAgent.array(),
  timelimit: z.number(),
});

export type Simulation = z.infer<typeof zSimulation>;
