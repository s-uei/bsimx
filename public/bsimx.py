from dataclasses import dataclass
import json
from math import sqrt
from typing import Any, Callable, Literal, Optional
import networkx as nx
from pyodide.http import pyfetch
import os
import hashlib
import math


async def get_max_flood_depth(
    G: nx.Graph,
    node: Any,
    groupType: Literal["max", "planned", "none"] = "max",
    force: bool = False,
) -> Optional[float]:
    """
    # test code
    G = await geocode_graph("香川県,郷東町")
    id = await geocode_node(G, "香川県,羽床")
    await get_max_flood_depth(G, id, force=True)
    """
    cache_name = hash(str(node) + groupType) + ".flood_depth"
    cache = load_cache(cache_name)
    if not force and cache:
        return float(cache)
    g = 0 if groupType == "max" else 1 if groupType == "planned" else -1
    lat = G.nodes[node]["lat"]
    lon = G.nodes[node]["lon"]
    url = f"https://suiboumap.gsi.go.jp/shinsuimap/Api/Public/GetMaxDepth?lon={lon}&lat={lat}&CSVScale={g}"
    print(url)
    res = await pyfetch(url)
    if not res.ok:
        return None
    d = await res.json()
    try:
        depth = d["Depth"]
    except:
        return None
    save_cache(cache_name, str(depth))
    return depth


def distance(latlon1: tuple[float, float], latlon2: tuple[float, float]):
    """https://en.wikipedia.org/wiki/Great-circle_distance"""
    lat1, lon1 = map(math.radians, latlon1)
    lat2, lon2 = map(math.radians, latlon2)
    R = 6371009  # earth radius(m)
    ds = math.acos(
        math.sin(lat1) * math.sin(lat2)
        + math.cos(lat1) * math.cos(lat2) * math.cos(abs(lon1 - lon2))
    )
    return R * ds


def save_cache(key: str, data: str):
    with open("/mnt/" + key, "w") as f:
        f.write(data)


def load_cache(key: str):
    p = "/mnt/" + key
    if not os.path.isfile(p):
        return None
    with open(p, "r") as f:
        return f.read()


def hash(s: str):
    return hashlib.md5(s.encode()).hexdigest()


async def area_graph(n: float, s: float, e: float, w: float):
    # await area_graph(34.294350, 34.292188,134.074541 ,134.060108)
    # [out:json][timeout:10];way(34.292188,134.060108,34.294350,134.074541) ["highway"];(._;>;);out body;
    res = await pyfetch(
        "https://overpass-api.de/api/interpreter",
        method="POST",
        body=f'[out:json][timeout:10];way({s},{w},{n},{e})["highway"];(._;>;);out body;',
    )
    if not res.ok:
        return None
    d = await res.json()
    G = nx.Graph()
    G.add_nodes_from([(n["id"], n) for n in d["elements"] if n["type"] == "node"])
    ways = [w for w in d["elements"] if w["type"] == "way"]
    edges = sum(
        [
            [
                (
                    n1,
                    n2,
                    {
                        "length": distance(
                            (G.nodes[n1]["lat"], G.nodes[n1]["lon"]),
                            (G.nodes[n2]["lat"], G.nodes[n2]["lon"]),
                        )
                    },
                )
                for n1, n2 in zip(way["nodes"][1:], way["nodes"][:-1])
            ]
            for way in ways
        ],
        [],
    )
    G.add_edges_from(edges)
    G.graph["area"] = {"n": n, "e": e, "s": s, "w": w}
    return G


async def geocode_graph(query: str, force: bool = False):
    cache = load_cache(hash(query) + ".graph")
    if not force and cache:
        return nx.node_link_graph(json.loads(cache))
    res = await pyfetch(
        f"https://nominatim.openstreetmap.org/search?format=json&q={query}",
    )
    if not res.ok:
        return None
    d = await res.json()
    if not d:
        return None
    s, n, w, e = [float(el) for el in d[0]["boundingbox"]]
    G = await area_graph(n, s, e, w)
    G.graph["query"] = query
    save_cache(hash(query) + ".graph", json.dumps(nx.node_link_data(G)))
    return G


async def geocode_node(G: nx.Graph, query: str, force: bool = False):
    cache = load_cache(hash(query) + ".node")
    if not force and cache:
        return int(cache)
    res = await pyfetch(
        f"https://nominatim.openstreetmap.org/search?format=json&q={query}",
    )
    if not res.ok:
        return None
    d = await res.json()
    if not d:
        return None
    lat = float(d[0]["lat"])
    lon = float(d[0]["lon"])
    area = G.graph["area"]
    if lat > area["n"] or lat < area["s"] or lon > area["e"] or lon < area["w"]:
        return None
    nearest = (None, float("inf"))
    for n, attr in G.nodes(data=True):
        n_lon = float(attr["lon"])
        n_lat = float(attr["lat"])
        d = (lat - n_lat) ** 2 + (lon - n_lon) ** 2
        if nearest[1] > d:
            nearest = (n, d)
    save_cache(hash(query) + ".node", str(nearest[0]))
    return nearest[0]


@dataclass
class Environment:
    G: nx.Graph
    time: float
    agents: list["Agent"]
    plans: list[tuple[float, Callable]]


class Agent:
    id: int
    env: Environment
    timelines: list[dict]
    node: Any

    def __init__(self, **kwargs) -> None:
        for key in kwargs:
            setattr(self, key, kwargs[key])

    def log(self):
        d = self.__dict__.copy()
        d.pop("env")
        d.pop("timelines")
        d["time"] = self.env.time
        self.timelines.append(d)

    def plan(self, time: float, method: Callable, args: tuple = (), kwargs: dict = {}):
        env = self.env
        bt = env.time
        env.plans.append((bt + time, lambda: method(*args, **kwargs)))

    def on_started(self):
        pass

    def on_moved(self):
        pass

    def move(self, node: Any, speed: float, length_key="length"):
        G = self.env.G
        d = G.edges[self.node, node][length_key]
        t = d / speed

        def p():
            self.node = node
            self.log()
            self.on_moved()

        self.plan(t, p)


def simulate(
    agents: list[Agent], G: nx.Graph, timelimit: float, tick: float = 1.0
) -> str:
    env = Environment(G=G, time=0, agents=[], plans=[])
    for i, a in enumerate(agents):
        a.id = str(i)
        a.env = env
        a.timelines = []
        env.agents.append(a)

    for a in agents:
        a.log()
        a.on_started()

    while env.time <= timelimit:
        env.time += tick
        excutables = [(i, t, c) for i, (t, c) in enumerate(env.plans) if t <= env.time]
        for i, t, c in excutables:
            c()
            env.plans[i] = None
        env.plans = [p for p in env.plans if p is not None]

    for a in agents:
        del a.env

    return json.dumps(
        {
            "node_link_data": nx.node_link_data(G),
            "agents": [a.__dict__.copy() for a in agents],
            "timelimit": timelimit,
        }
    )
