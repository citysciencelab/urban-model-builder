import { pathToFileURL } from "node:url";
import { register } from "node:module";
import { setUncaughtExceptionCaptureCallback } from "node:process";

setUncaughtExceptionCaptureCallback((error) => {
  debugger
  console.error(error);
  process.exit(1);
});

register("ts-node/esm", pathToFileURL("./"));