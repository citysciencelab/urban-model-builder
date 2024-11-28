export function toSimulationVectorString(json: any, pretty = false) {
  return JSON.stringify(json, null, pretty ? 2 : undefined)
    .replace(/\[/g, '{')
    .replace(/\]/g, '}')
}
