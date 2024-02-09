import { useEffect, useState } from "react";
import { PyodideInterface } from "pyodide";

export function useFrame(
  callback: (ts: number) => void,
  deps?: React.DependencyList | undefined
) {
  useEffect(() => {
    let base: number | null = null;
    let req: number = 0;
    function f(t: number) {
      if (base !== null) {
        const span = t - base;
        callback(span / 1000);
      }
      base = t;
      req = requestAnimationFrame(f);
    }
    req = requestAnimationFrame(f);
    return () => {
      cancelAnimationFrame(req);
    };
  }, deps);
}

export function usePyodide() {
  const [loading, setLoading] = useState(true);
  const [pyodide, setPyodide] = useState<null | PyodideInterface>(null);
  useEffect(() => {
    (async () => {
      const pyodide = await window.loadPyodide();
      let mountDir = "/mnt";
      pyodide.FS.mkdir(mountDir);
      pyodide.FS.mount(pyodide.FS.filesystems.IDBFS, { root: "." }, mountDir);
      await pyodide.loadPackage("networkx");
      pyodide.runPython(
        await (await fetch((process.env.BASE_PATH ?? "") + "/bsimx.py")).text()
      );
      setPyodide(pyodide);
      setLoading(false);
    })();
  }, []);
  return { pyodide, loading };
}
