function range (startAt = 0, size, zeroBasedArray) {
  startAt = zeroBasedArray ? startAt : startAt + 1
  size = zeroBasedArray ? size : size + 1
  return [...Array(Math.max(+size, 0)).keys()].map(i => i + +startAt)
}

function rangeInclusive (start, end) {
  const size = Math.max(end - start + 1, 0)
  return [...Array(size).keys()].map(i => i + +start)
}

module.exports = {
  range,
  rangeInclusive
}
