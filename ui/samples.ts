import { Simulation } from "./types";

export const pythonCodes = [
  `# 香川大学林町キャンパスへの最短経路避難
import networkx as nx
import random

# 林町周辺のグラフを取得
G = await geocode_graph("香川県,高松市,林町")
# 香川大学林町キャンパス付近のノードIDを取得
GOAL = await geocode_node(G, "香川大学,林町")
# 歩行者の速度
SPEED = 1.0
# エージェント数
N = 1000
# シミュレーション時間制限
TL = 6000

# 避難者の行動定義
class Escaper(Agent):
    route = [] # 避難経路
    speed: float # 歩行速度
    goal: int # 目的地

    # ノード移動後の処理
    def on_moved(self):
        # ゴールに到着した
        if not self.route:
            return
        # 経路上の次のノードへ移動
        next_node = self.route.pop(0)
        self.move(next_node, self.speed)

    # シミュレーション開始時処理
    def on_started(self):
        try:
            # 最短経路(ノードIDリスト)
            self.route = nx.shortest_path(G, self.node, self.goal)
        except:
            return
        # 最初のノードは現在地なので廃棄
        self.route.pop(0)
        self.on_moved()

# エージェントを町中にランダムに発生
random.seed(123)
agents=[
  Escaper(node=node, goal=GOAL, speed=SPEED)
  for node
  in random.choices(list(G.nodes), k=N)
]

# シミュレーション
simulate(
  agents=agents,
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
