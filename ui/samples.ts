import { Simulation } from "./types";

export const pythonCodes = [
  `#example01
import networkx as nx
import random

G = await geocode_graph("香川県,高松市,林町")
GOAL = await geocode_node(G, "香川大学,林町")
SPEED = 1.0
N = 1000
TL = 6000

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
      in random.choices(list(G.nodes), k=N)
  ],
  G=G,
  timelimit=TL,
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
  `# test G force
import networkx as nx
import random
import time

start = time.time()
G = await geocode_graph("香川県,高松市,林町", force=True)
end = time.time()
print(end - start)

start = time.time()
GOAL = await geocode_node(G, "香川大学,林町", force=True)
end = time.time()
print(end - start)
`,
  `# test G
import networkx as nx
import random
import time

start = time.time()
G = await geocode_graph("香川県,高松市,林町")
end = time.time()
print(end - start)

start = time.time()
GOAL = await geocode_node(G, "香川大学,林町")
end = time.time()
print(end - start)
`,
  `# test G pref
import networkx as nx
import random
import time

start = time.time()
G = await geocode_graph("香川県", force=True)
end = time.time()
print(end - start)

start = time.time()
GOAL = await geocode_node(G, "香川大学,林町", force=True)
end = time.time()
print(end - start)
`,
  `# test
import networkx as nx
import random
import time

G = await geocode_graph("香川県,高松市,林町")
GOAL = await geocode_node(G, "香川大学,林町")
SPEED = 1.0
N = 100
TL = 6000

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
times = []
for i in range(1000, 5001, 1000):
    start = time.time()
    s = simulate(
      agents=[
          Escaper(node=node) 
          for node 
          in random.choices(list(G.nodes), k=i)
      ],
      G=G,
      timelimit=TL,
    )
    end = time.time()
    times.append(end - start)
print(times)
`,
  `# test 2
import networkx as nx
import random
import time

G = await geocode_graph("香川県,高松市,林町")
GOAL = await geocode_node(G, "香川大学,林町")
SPEED = 1.0
N = 1000
TL = 6000

times = []

class Escaper(Agent):
    route = []

    def on_moved(self):
        if not self.route:
            times.append(self.env.time)
            return
        next_node = self.route.pop(0)
        self.move(next_node, SPEED)

    def on_started(self):
        try:
            self.route = nx.shortest_path(G, self.node, GOAL)
        except:
            return
        self.route.pop(0)
        self.on_moved()

random.seed(123)
s = simulate(
  agents=[
      Escaper(node=node) 
      for node 
      in random.choices(list(G.nodes), k=N)
  ],
  G=G,
  timelimit=TL,
)
print(times)
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
