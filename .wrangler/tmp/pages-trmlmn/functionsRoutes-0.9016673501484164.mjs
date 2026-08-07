import { onRequest as __api___path___ts_onRequest } from "C:\\Users\\ACER\\Desktop\\trip-buddy\\functions\\api\\[[path]].ts"
import { onRequest as __upload_ts_onRequest } from "C:\\Users\\ACER\\Desktop\\trip-buddy\\functions\\upload.ts"

export const routes = [
    {
      routePath: "/api/:path*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___path___ts_onRequest],
    },
  {
      routePath: "/upload",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__upload_ts_onRequest],
    },
  ]