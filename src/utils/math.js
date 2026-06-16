// Box-Muller transform: produces a Gaussian-distributed random value (mean 0, stddev 1)
export function gaussian() {
  const u = 1 - Math.random()
  const v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
