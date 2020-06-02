function range (startAt = 0, size, zeroBasedArray) {
  startAt = zeroBasedArray ? startAt : startAt + 1
  size = zeroBasedArray ? size : size + 1
  return [...Array(Math.max(+size, 0)).keys()].map(i => i + +startAt)
}

module.exports = {
  range
}
