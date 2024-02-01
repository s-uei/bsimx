import { Simulation } from "./types";

export const pythonCodes = [
  `#example01
import networkx as nx
import random

G = await geocode_graph("香川県,高松市,林町")
GOAL = await geocode_node(G, "香川大学,林町")
SPEED = 40 * 1000 / 3600 # 40 km/h

class Escaper(Agent):
    route = []

    def on_moved(self):
        if not self.route:
            return
        next_node = self.route.pop(0)
        self.move(next_node, SPEED)

    def on_started(self):
        # 最短経路
        try:
            self.route = nx.shortest_path(G, self.node, GOAL)
        except:
            return
        self.route.pop(0)
        self.on_moved()

random.seed(123)
simulate(
  agents=[
      Escaper(node=node) 
      for node 
      in random.sample(list(G.nodes), 10)
  ],
  G=G,
  timelimit=100,
)
`,
  `# wealth transfer
import random
import networkx as nx
import json
import time

random.seed(123)

class MoneyAgent(Agent):
    wealth: int

    def transfer(self):
        if self.wealth > 0:
            a = random.choice(self.env.agents)
            a.wealth += 1
            self.wealth -= 1
        self.log()
        self.plan(1.0, lambda: self.transfer())

    def on_started(self):
        self.wealth = 1
        self.plan(1.0, lambda: self.transfer())

start = time.time()  # 現在時刻（処理開始前）を取得
s = simulate(
  agents = [MoneyAgent() for _ in range(1000)],
  G=nx.Graph(),
  timelimit = 1000
)
end = time.time()  # 現在時刻（処理開始前）を取得
print(end - start)
d = json.loads(s)

wealth_dist = sorted([ a['timelines'][-1]['wealth'] for a in d['agents']], reverse=True)
print(wealth_dist)
`,
];

export const emptySimulation: Simulation = {
  node_link_data: {
    directed: false,
    multigraph: false,
    graph: {},
    nodes: [],
    links: [],
  },
  agents: [],
  timelimit: 0,
};
