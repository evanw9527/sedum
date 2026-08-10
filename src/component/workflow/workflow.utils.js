export function edgePath(from, to) {
  const startX = from.x + 220
  const startY = from.y + 48
  const endX = to.x
  const endY = to.y + 48
  const bend = Math.max(56, (endX - startX) * 0.52)

  return `M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`
}
