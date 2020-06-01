function emission (initial, decay, tail, block) {
  console.log(initial, decay, tail, block)

  function calc (block) {
    return (Math.trunc(+initial * Math.pow(+decay, +block))) + +tail
  }
  return [...Array(+block + 1).keys()].reduce((acc, b) => acc + calc(b), 0)
}
module.exports = {
  emission
}
